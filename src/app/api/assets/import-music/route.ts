import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { storage, assetKey } from "@/lib/storage";
import { detectFileType } from "@/lib/media/validate";
import { enqueue } from "@/lib/queue";
import { ALLOWED_AUDIO_EXT } from "@/lib/constants";

/** Import skonfigurowanej biblioteki licencjonowanej muzyki (MUSIC_LIBRARY_DIR). */
export const POST = route(async () => {
  const user = await requireApiUser();
  const dir = env().MUSIC_LIBRARY_DIR;
  if (!dir) throw new HttpError(400, "Biblioteka muzyki nie jest skonfigurowana (MUSIC_LIBRARY_DIR).");
  const files = (await fs.readdir(dir)).filter((f) => ALLOWED_AUDIO_EXT.includes(f.split(".").pop()?.toLowerCase() ?? ""));
  let imported = 0;
  for (const f of files) {
    if (await db.mediaAsset.findFirst({ where: { userId: user.id, role: "MUSIC", originalName: f, license: { startsWith: "Biblioteka" } } })) continue;
    const full = path.join(dir, f);
    const head = Buffer.alloc(64);
    const fh = await fs.open(full, "r");
    await fh.read(head, 0, 64, 0);
    await fh.close();
    const t = detectFileType(head, f);
    if (t?.kind !== "AUDIO") continue;
    const st = await fs.stat(full);
    const asset = await db.mediaAsset.create({ data: { userId: user.id, kind: "AUDIO", role: "MUSIC", originalName: f, mimeType: t.mime, sizeBytes: BigInt(st.size), storageKey: "pending", license: "Biblioteka studia (MUSIC_LIBRARY_DIR)" } });
    const key = assetKey(user.id, asset.id, `original.${t.container}`);
    const tmp = path.join(path.resolve(env().STORAGE_DIR, "tmp"), `${asset.id}.import`);
    await fs.mkdir(path.dirname(tmp), { recursive: true });
    await fs.copyFile(full, tmp);
    await storage().putFile(key, tmp, t.mime);
    await db.mediaAsset.update({ where: { id: asset.id }, data: { storageKey: key } });
    await enqueue("ingest", { assetId: asset.id }, { userId: user.id, stage: "Analiza muzyki" });
    imported++;
  }
  return json({ imported });
});
