import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { storage, assetKey } from "../../lib/storage";
import { ffmpeg } from "../../lib/media/ffmpeg";
import { probeMedia } from "../../lib/media/probe";
import { measureLoudness } from "../../lib/media/audio";
import { extractFrame, extractLastFrame } from "../../lib/media/derivatives";
import { buildRenderCommand, type RenderAsset, type RenderQuality } from "../../lib/timeline/render-graph";
import { TimelineDocSchema } from "../../lib/timeline/types";
import { toAss, toSrt } from "../../lib/timeline/subtitles";
import { prePublishChecklist } from "../../lib/timeline/checklist";
import { enqueue } from "../../lib/queue";
import { withWorkdir } from "../workdir";
import type { JobContext } from "../context";

export interface RenderJobOptions {
  quality: RenderQuality;
  burnSubtitles: boolean;
  withLogo: boolean;
  loudnorm: boolean;
  /** Podgląd w niższej rozdzielczości (bez eksportu) */
  preview: boolean;
  fps?: number | null;
  /** Ponowna ocena wyrenderowanej wersji (np. po „Popraw rolkę”) */
  reanalyzeParentId?: string | null;
}

export async function runRenderJob(renderJobId: string, ctx: JobContext) {
  const rj = await db.renderJob.findUniqueOrThrow({ where: { id: renderJobId }, include: { editingProject: { include: { project: true } } } });
  const project = rj.editingProject.project;
  const opts = rj.options as unknown as RenderJobOptions;
  await db.renderJob.update({ where: { id: renderJobId }, data: { status: "RUNNING", startedAt: new Date(), error: null } });
  try {
    const doc = TimelineDocSchema.parse(rj.snapshot);
    if (!doc.video.length) throw new Error("Timeline jest pusta — dodaj co najmniej jeden klip.");
    const ids = [...new Set([...doc.video.map((v) => v.assetId), ...doc.audio.map((a) => a.assetId), ...doc.logos.map((l) => l.assetId)])];
    const rows = await db.mediaAsset.findMany({ where: { id: { in: ids }, userId: project.userId } });
    const st = storage();
    const assets: Record<string, RenderAsset> = {};
    await ctx.progress(2, "Przygotowanie materiałów źródłowych");
    for (const a of rows) {
      if (a.status !== "READY") throw new Error(`Plik „${a.originalName}” nie jest jeszcze przetworzony.`);
      const key = a.kind === "IMAGE" ? a.proxyKey ?? a.storageKey : a.storageKey; // render zawsze z oryginału
      assets[a.id] = { path: await st.localPath(key), hasAudio: a.hasAudio, durationSec: a.durationSec ?? 3600, width: a.width ?? 1080, height: a.height ?? 1920 };
    }
    for (const id of ids) if (!assets[id]) throw new Error("Brak jednego z plików źródłowych projektu (mógł zostać usunięty).");

    return await withWorkdir(`render-${renderJobId}`, async (dir) => {
      let assPath: string | null = null;
      if (opts.burnSubtitles && doc.texts.length) {
        assPath = path.join(dir, "subtitles.ass");
        await fs.writeFile(assPath, toAss(doc), "utf8");
      }
      const outPath = path.join(dir, "render.mp4");
      const cmd = buildRenderCommand(doc, assets, {
        outPath,
        assPath,
        fontsDir: path.resolve(process.cwd(), "public/fonts"),
        quality: opts.preview ? "draft" : opts.quality,
        withLogo: opts.withLogo,
        loudnorm: opts.loudnorm,
        ...(opts.preview ? { width: 540, height: 960 } : {}),
        ...(opts.fps ? { fps: opts.fps } : {}),
      });
      await ctx.progress(5, "Renderowanie wideo (FFmpeg)");
      await ffmpeg(cmd.args, {
        signal: ctx.signal,
        durationSec: cmd.durationSec,
        onProgress: (f) => {
          void ctx.progress(5 + f * 85, "Renderowanie wideo (FFmpeg)");
          void db.renderJob.update({ where: { id: renderJobId }, data: { progress: Math.round(f * 1000) / 10 } }).catch(() => undefined);
        },
      });

      await ctx.progress(92, "Kontrola jakości pliku wynikowego");
      const info = await probeMedia(outPath, ctx.signal);
      const loud = info.hasAudio ? await measureLoudness(outPath, ctx.signal) : { integratedLufs: null, truePeakDb: null, loudnessRange: null };
      const size = (await fs.stat(outPath)).size;
      const asset = await db.mediaAsset.create({
        data: {
          userId: project.userId,
          projectId: project.id,
          kind: "VIDEO",
          role: "RENDER",
          status: "READY",
          originalName: `${rj.editingProject.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "rolka"}${opts.preview ? " (podgląd)" : ""}.mp4`,
          mimeType: "video/mp4",
          sizeBytes: BigInt(size),
          storageKey: "pending",
          durationSec: info.durationSec,
          width: info.width,
          height: info.height,
          fps: info.fps,
          hasAudio: info.hasAudio,
          videoCodec: info.videoCodec,
          audioCodec: info.audioCodec,
          bitrate: info.bitrate,
          metadata: { probe: info, loudness: loud } as unknown as Prisma.InputJsonValue,
        },
      });
      const k = (n: string) => assetKey(project.userId, asset.id, n);
      const poster = await extractFrame(outPath, path.join(dir, "poster.jpg"), Math.min(1, info.durationSec / 3), 540, ctx.signal);
      const last = await extractLastFrame(outPath, path.join(dir, "last.jpg"), 540, ctx.signal);
      await st.putFile(k("poster.jpg"), poster, "image/jpeg");
      await st.putFile(k("last.jpg"), last, "image/jpeg");
      await st.putFile(k("render.mp4"), outPath, "video/mp4");
      let srtKey: string | null = null;
      if (doc.texts.length) {
        srtKey = k("napisy.srt");
        await st.putBuffer(srtKey, toSrt(doc.texts), "application/x-subrip");
      }
      await db.mediaAsset.update({
        where: { id: asset.id },
        data: { storageKey: k("render.mp4"), proxyKey: k("render.mp4"), posterKey: k("poster.jpg"), metadata: { probe: info, loudness: loud, lastFrameKey: k("last.jpg") } as unknown as Prisma.InputJsonValue },
      });

      const checklist = prePublishChecklist(
        doc,
        { width: info.width, height: info.height, fps: info.fps, durationSec: info.durationSec, videoCodec: info.videoCodec, audioCodec: info.audioCodec, bitrate: info.bitrate, integratedLufs: loud.integratedLufs, truePeakDb: loud.truePeakDb },
        { burnSubtitles: opts.burnSubtitles, withLogo: opts.withLogo },
      );
      let exportId: string | null = null;
      if (!opts.preview) {
        const ex = await db.export.create({
          data: {
            editingProjectId: rj.editingProjectId,
            renderJobId,
            assetId: asset.id,
            platform: doc.settings.platform,
            width: info.width ?? 0,
            height: info.height ?? 0,
            fps: info.fps ?? doc.settings.fps,
            durationSec: info.durationSec,
            sizeBytes: BigInt(size),
            burnedSubtitles: opts.burnSubtitles,
            withLogo: opts.withLogo,
            srtKey,
            checklist: checklist as unknown as Prisma.InputJsonValue,
          },
        });
        exportId = ex.id;
        await db.project.update({ where: { id: project.id }, data: { status: "RENDERED" } });
      }
      await db.renderJob.update({ where: { id: renderJobId }, data: { status: "COMPLETED", progress: 100, outputAssetId: asset.id, finishedAt: new Date() } });

      if (opts.reanalyzeParentId) {
        const parent = await db.analysis.findUnique({ where: { id: opts.reanalyzeParentId } });
        if (parent) {
          const child = await db.analysis.create({
            data: { projectId: project.id, assetId: asset.id, parentAnalysisId: parent.id, goal: parent.goal, platform: parent.platform, service: parent.service },
          });
          await enqueue("analyze", { analysisId: child.id }, { userId: project.userId, projectId: project.id, stage: "Ponowna ocena poprawionej wersji" });
        }
      }
      return { assetId: asset.id, exportId, checklist };
    });
  } catch (err) {
    await db.renderJob.update({
      where: { id: renderJobId },
      data: { status: ctx.signal.aborted ? "CANCELLED" : "FAILED", error: ctx.signal.aborted ? "Render anulowany." : (err as Error).message.slice(0, 600), finishedAt: new Date() },
    });
    throw err;
  }
}
