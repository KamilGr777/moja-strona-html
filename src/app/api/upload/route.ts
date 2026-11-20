import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { storage, assetKey } from "@/lib/storage";
import { detectFileType } from "@/lib/media/validate";
import { enqueue } from "@/lib/queue";
import { ownedClient, ownedProject } from "@/lib/services/guard";
import { ALLOWED_AUDIO_EXT, ALLOWED_IMAGE_EXT, ALLOWED_VIDEO_EXT } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 300;

const Query = z.object({
  name: z.string().min(1).max(200),
  role: z.enum(["SOURCE_REEL", "RAW_CLIP", "MUSIC", "LOGO", "THUMBNAIL"]),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  license: z.string().max(300).optional(),
});

const ROLE_KIND = { SOURCE_REEL: "VIDEO", RAW_CLIP: "VIDEO", MUSIC: "AUDIO", LOGO: "IMAGE", THUMBNAIL: "IMAGE" } as const;

/**
 * Upload strumieniowy (PUT, surowe body): bez buforowania całego pliku w pamięci.
 * Walidacja: rozmiar (Content-Length + w trakcie), rozszerzenie, sygnatura pliku (magic bytes),
 * a następnie FFprobe w workerze.
 */
export const PUT = route(async (req) => {
  const user = await requireApiUser();
  await rateLimit(`upload:${user.id}`, env().RATE_LIMIT_UPLOADS_PER_HOUR, 3600, "przesyłanych plików");
  const q = Query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const kind = ROLE_KIND[q.role];
  const ext = q.name.toLowerCase().split(".").pop() ?? "";
  const allowed = kind === "VIDEO" ? ALLOWED_VIDEO_EXT : kind === "AUDIO" ? [...ALLOWED_AUDIO_EXT, "mp4"] : ALLOWED_IMAGE_EXT;
  if (!allowed.includes(ext)) throw new HttpError(415, `Nieobsługiwany format pliku (.${ext}). Dozwolone: ${allowed.join(", ")}.`);
  const maxBytes = (q.role === "LOGO" || q.role === "THUMBNAIL" ? 20 : env().MAX_UPLOAD_MB) * 1024 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new HttpError(413, `Plik jest za duży. Limit: ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  if (!req.body) throw new HttpError(400, "Brak treści pliku.");
  if (q.projectId) await ownedProject(user.id, q.projectId);
  if (q.clientId) await ownedClient(user.id, q.clientId);

  const tmpDir = path.resolve(env().STORAGE_DIR, "tmp");
  await fsp.mkdir(tmpDir, { recursive: true });
  const tmp = path.join(tmpDir, `${randomUUID()}.upload`);
  const hash = createHash("sha256");
  let size = 0;
  let head = Buffer.alloc(0);
  const meter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > maxBytes) return cb(new HttpError(413, `Plik jest za duży. Limit: ${Math.round(maxBytes / 1024 / 1024)} MB.`));
      if (head.length < 64) head = Buffer.concat([head, chunk.subarray(0, 64 - head.length)]);
      hash.update(chunk);
      cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), meter, fs.createWriteStream(tmp));
    if (size === 0) throw new HttpError(400, "Plik jest pusty.");
    const detected = detectFileType(head, q.name);
    if (!detected || detected.kind !== kind) {
      throw new HttpError(415, kind === "VIDEO" ? "Plik nie jest obsługiwanym nagraniem wideo (MP4, MOV, WebM)." : kind === "AUDIO" ? "Plik nie jest obsługiwanym plikiem audio." : "Plik nie jest obrazem PNG/JPG/WebP.");
    }
    const asset = await db.mediaAsset.create({
      data: {
        userId: user.id,
        projectId: q.projectId ?? null,
        clientId: q.clientId ?? null,
        kind,
        role: q.role,
        originalName: q.name.slice(0, 200),
        mimeType: detected.mime,
        sizeBytes: BigInt(size),
        sha256: hash.digest("hex"),
        storageKey: "pending",
        license: q.license ?? null,
      },
    });
    const key = assetKey(user.id, asset.id, `original.${detected.container}`);
    await storage().putFile(key, tmp, detected.mime);
    let saved = await db.mediaAsset.update({ where: { id: asset.id }, data: { storageKey: key } });
    if (q.role === "THUMBNAIL") {
      saved = await db.mediaAsset.update({ where: { id: asset.id }, data: { status: "READY", posterKey: key, proxyKey: key } });
      if (q.projectId) await db.project.update({ where: { id: q.projectId }, data: { thumbnailAssetId: asset.id } });
    } else {
      if (q.role === "RAW_CLIP" && q.projectId) {
        const order = await db.videoClip.count({ where: { projectId: q.projectId } });
        await db.videoClip.create({ data: { projectId: q.projectId, assetId: asset.id, order } });
      }
      if (q.role === "LOGO" && q.clientId) await db.client.update({ where: { id: q.clientId }, data: { logoAssetId: asset.id } });
      await enqueue("ingest", { assetId: asset.id }, { userId: user.id, projectId: q.projectId, stage: "Przetwarzanie pliku" });
    }
    return json({ asset: saved }, { status: 201 });
  } finally {
    await fsp.rm(tmp, { force: true }).catch(() => undefined);
  }
});
