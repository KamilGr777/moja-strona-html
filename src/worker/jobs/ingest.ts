import path from "node:path";
import type { MediaAsset, Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { env } from "../../lib/env";
import { storage, assetKey } from "../../lib/storage";
import { probeMedia } from "../../lib/media/probe";
import { createProxy, createSprite, extractFrame, normalizeImage } from "../../lib/media/derivatives";
import { detectScenes, sampleFrameStats, statsForRange, type FrameSample } from "../../lib/media/video-analysis";
import { analyzeAudio, type AudioAnalysis } from "../../lib/media/audio";
import { CancelledError } from "../../lib/media/ffmpeg";
import { sceneInterest } from "../../lib/analysis/heuristics";
import { withWorkdir } from "../workdir";
import type { ProgressFn } from "../context";

export class UserFacingError extends Error {}

/**
 * Przetwarzanie wgranego pliku: metadane (ffprobe), proxy do przeglądarki, miniatury,
 * wykrywanie scen, statystyki obrazu, klatki scen i analiza audio (głośność, BPM, beaty).
 */
export async function ingestAsset(assetId: string, progress: ProgressFn, signal: AbortSignal): Promise<MediaAsset> {
  let asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
  // wyrenderowane MP4 są od razu „READY” (do pobrania), ale nie mają jeszcze scen i statystyk obrazu
  const needsAnalysis = asset.kind === "VIDEO" && !(asset.metadata as { statsKey?: string } | null)?.statsKey;
  if (asset.status === "READY" && !needsAnalysis) return asset;
  // Atomowe „zajęcie” pliku — jeśli przetwarza go inne zadanie, czekamy na wynik.
  const claimable: Array<"UPLOADED" | "FAILED" | "READY"> = needsAnalysis ? ["UPLOADED", "FAILED", "READY"] : ["UPLOADED", "FAILED"];
  const claimed = await db.mediaAsset.updateMany({ where: { id: assetId, status: { in: claimable } }, data: { status: "PROCESSING", error: null } });
  if (claimed.count === 0) {
    const deadline = Date.now() + 15 * 60_000;
    while (Date.now() < deadline) {
      await progress(0.05, "Oczekiwanie na przetworzenie pliku");
      await new Promise((r) => setTimeout(r, 1500));
      if (signal.aborted) throw new CancelledError();
      asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
      if (asset.status === "READY") return asset;
      if (asset.status === "FAILED") throw new UserFacingError(asset.error ?? "Przetwarzanie pliku nie powiodło się.");
    }
    // przetwarzanie „utknęło” (np. awaria workera) — przejmujemy je
    await db.mediaAsset.update({ where: { id: assetId }, data: { status: "PROCESSING", error: null } });
  }
  const st = storage();
  try {
    return await withWorkdir(assetId, async (dir) => {
      await progress(0.02, "Odczyt metadanych pliku");
      const src = await st.localPath(asset.storageKey);
      const info = await probeMedia(src, signal);
      const key = (name: string) => assetKey(asset.userId, asset.id, name);

      if (asset.kind === "VIDEO") {
        if (!info.hasVideo) throw new UserFacingError("Plik nie zawiera ścieżki wideo.");
        if (!info.durationSec || info.durationSec < 0.3) throw new UserFacingError("Nie udało się odczytać długości filmu.");
        if (info.durationSec > env().MAX_VIDEO_DURATION_SEC) throw new UserFacingError(`Film jest za długi (${Math.round(info.durationSec)} s). Limit: ${env().MAX_VIDEO_DURATION_SEC} s.`);

        await progress(0.05, "Tworzenie wersji podglądowej (proxy)");
        const proxyPath = path.join(dir, "proxy.mp4");
        await createProxy(src, proxyPath, info, { signal, onProgress: (f) => void progress(0.05 + f * 0.45) });
        await st.putFile(key("proxy.mp4"), proxyPath, "video/mp4");
        const proxyLocal = await st.localPath(key("proxy.mp4"));

        await progress(0.52, "Miniatury i pasek klatek");
        const poster = await extractFrame(proxyLocal, path.join(dir, "poster.jpg"), Math.min(1, info.durationSec * 0.3), 540, signal);
        await st.putFile(key("poster.jpg"), poster, "image/jpeg");
        const spriteMeta = await createSprite(proxyLocal, path.join(dir, "sprite.jpg"), info, signal);
        await st.putFile(key("sprite.jpg"), path.join(dir, "sprite.jpg"), "image/jpeg");

        await progress(0.62, "Wykrywanie cięć i scen");
        const scenes = await detectScenes(proxyLocal, info.durationSec, { signal });
        await progress(0.7, "Pomiar ruchu, ostrości i jasności");
        const samples = await sampleFrameStats(proxyLocal, { signal });
        await st.putBuffer(key("stats.json"), JSON.stringify(samples), "application/json");

        await progress(0.78, "Ekstrakcja klatek scen");
        const sceneRows: Prisma.SceneCreateManyInput[] = [];
        for (const s of scenes) {
          const stats = statsForRange(samples, s.start, s.end);
          const mid = s.start + (s.end - s.start) / 2;
          const fname = `scene_${s.index}.jpg`;
          await extractFrame(proxyLocal, path.join(dir, fname), Math.min(mid, info.durationSec - 0.05), 512, signal);
          await st.putFile(key(fname), path.join(dir, fname), "image/jpeg");
          sceneRows.push({
            assetId,
            index: s.index,
            start: s.start,
            end: s.end,
            motion: stats.motion,
            brightness: stats.brightness,
            sharpness: stats.sharpness,
            saturation: stats.saturation,
            frameKey: key(fname),
            interestScore: null,
            aiData: { contrast: stats.contrast, heuristicInterest: sceneInterest(stats), cutScore: s.cutScore } as Prisma.InputJsonValue,
          });
        }
        await db.scene.deleteMany({ where: { assetId } });
        await db.scene.createMany({ data: sceneRows });

        let audio: AudioAnalysis | null = null;
        if (info.hasAudio) {
          await progress(0.88, "Analiza ścieżki audio");
          audio = await analyzeAudio(proxyLocal, { signal });
          await st.putBuffer(key("waveform.json"), JSON.stringify({ step: audio.waveformStep, peaks: audio.waveform }), "application/json");
        }
        await progress(0.98, "Zapisywanie wyników");
        return db.mediaAsset.update({
          where: { id: assetId },
          data: {
            status: "READY",
            proxyKey: key("proxy.mp4"),
            posterKey: key("poster.jpg"),
            spriteKey: key("sprite.jpg"),
            waveformKey: audio ? key("waveform.json") : null,
            durationSec: info.durationSec,
            width: info.width,
            height: info.height,
            fps: info.fps,
            rotation: info.rotation,
            hasAudio: info.hasAudio,
            videoCodec: info.videoCodec,
            audioCodec: info.audioCodec,
            bitrate: info.bitrate,
            metadata: { ...((asset.metadata as object) ?? {}), probe: info, sprite: spriteMeta, statsKey: key("stats.json"), sceneCount: scenes.length } as unknown as Prisma.InputJsonValue,
            audioAnalysis: audio ? (stripWaveform(audio) as unknown as Prisma.InputJsonValue) : undefined,
          },
        });
      }

      if (asset.kind === "AUDIO") {
        if (!info.hasAudio) throw new UserFacingError("Plik nie zawiera ścieżki audio.");
        if (info.durationSec > 900) throw new UserFacingError("Plik audio jest za długi (maks. 15 min).");
        await progress(0.2, "Analiza muzyki: głośność, tempo, beaty");
        const audio = await analyzeAudio(src, { signal });
        await st.putBuffer(key("waveform.json"), JSON.stringify({ step: audio.waveformStep, peaks: audio.waveform }), "application/json");
        return db.mediaAsset.update({
          where: { id: assetId },
          data: {
            status: "READY",
            durationSec: info.durationSec,
            hasAudio: true,
            audioCodec: info.audioCodec,
            bitrate: info.bitrate,
            waveformKey: key("waveform.json"),
            metadata: { probe: info } as unknown as Prisma.InputJsonValue,
            audioAnalysis: stripWaveform(audio) as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // IMAGE (logo, okładka)
      await progress(0.3, "Przetwarzanie obrazu");
      const png = await normalizeImage(src, path.join(dir, "image.png"), 1024, signal);
      const pinfo = await probeMedia(png, signal);
      await st.putFile(key("image.png"), png, "image/png");
      return db.mediaAsset.update({
        where: { id: assetId },
        data: { status: "READY", proxyKey: key("image.png"), posterKey: key("image.png"), width: pinfo.width, height: pinfo.height, metadata: { probe: pinfo } as unknown as Prisma.InputJsonValue },
      });
    });
  } catch (err) {
    const msg = err instanceof UserFacingError ? err.message : signal.aborted ? "Przetwarzanie anulowane." : `Nie udało się przetworzyć pliku: ${(err as Error).message.slice(0, 300)}`;
    await db.mediaAsset.update({ where: { id: assetId }, data: { status: "FAILED", error: msg } });
    throw err;
  }
}

function stripWaveform(a: AudioAnalysis) {
  const { waveform: _w, energyDb, ...rest } = a;
  void _w;
  // energia co 100 ms jest przydatna do wykresu — zostawiamy w rozsądnym rozmiarze
  return { ...rest, energyDb: energyDb.length > 6000 ? energyDb.filter((_, i) => i % 2 === 0) : energyDb };
}

export async function loadSamples(asset: Pick<MediaAsset, "metadata">): Promise<FrameSample[]> {
  const key = (asset.metadata as { statsKey?: string })?.statsKey;
  if (!key) return [];
  try {
    return JSON.parse((await storage().readBuffer(key)).toString("utf8")) as FrameSample[];
  } catch {
    return [];
  }
}
