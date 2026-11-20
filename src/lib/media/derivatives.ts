import path from "node:path";
import { ffmpeg } from "./ffmpeg";
import type { MediaInfo } from "./probe";

function even(n: number) {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** Wymiary proxy: krótszy bok maks. 720 px, zachowane proporcje. */
export function proxySize(info: Pick<MediaInfo, "width" | "height">) {
  const w = info.width ?? 720;
  const h = info.height ?? 1280;
  const short = Math.min(w, h);
  const scale = short > 720 ? 720 / short : 1;
  return { width: even(w * scale), height: even(h * scale) };
}

/**
 * Proxy H.264 do płynnego odtwarzania i przewijania w przeglądarce
 * (keyframe co sekundę). Oryginał pozostaje nietknięty i jest używany do renderu.
 */
export async function createProxy(src: string, dest: string, info: MediaInfo, opts: { signal?: AbortSignal; onProgress?: (f: number) => void } = {}) {
  const { width, height } = proxySize(info);
  const fps = Math.min(60, Math.round(info.fps ?? 30)) || 30;
  const args = [
    "-i", src,
    "-map", "0:v:0",
    ...(info.hasAudio ? ["-map", "0:a:0"] : []),
    "-vf", `scale=${width}:${height}:flags=bicubic,format=yuv420p`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-g", String(fps), "-keyint_min", String(fps), "-sc_threshold", "0",
    ...(info.fps && info.fps > 60 ? ["-r", "60"] : []),
    ...(info.hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000"] : ["-an"]),
    "-movflags", "+faststart",
    dest,
  ];
  await ffmpeg(args, { signal: opts.signal, onProgress: opts.onProgress, durationSec: info.durationSec });
  return { width, height };
}

export async function extractFrame(src: string, dest: string, atSec: number, width = 512, signal?: AbortSignal) {
  await ffmpeg(["-ss", atSec.toFixed(3), "-i", src, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "3", dest], { signal });
  return dest;
}

/** Ostatnia klatka filmu (odporne na niedokładne seekowanie przy końcu pliku). */
export async function extractLastFrame(src: string, dest: string, width = 540, signal?: AbortSignal) {
  await ffmpeg(["-sseof", "-0.6", "-i", src, "-vf", `scale=${width}:-2`, "-update", "1", "-q:v", "3", dest], { signal });
  return dest;
}

export interface SpriteMeta {
  count: number;
  interval: number;
  frameWidth: number;
  frameHeight: number;
}

/** Pasek miniatur (jeden rząd) do wyświetlania klipów na timeline. */
export async function createSprite(src: string, dest: string, info: MediaInfo, signal?: AbortSignal): Promise<SpriteMeta> {
  const dur = Math.max(0.5, info.durationSec);
  const interval = Math.max(0.5, dur / 120);
  const count = Math.max(1, Math.ceil(dur / interval));
  const frameHeight = 96;
  const ratio = (info.width ?? 9) / (info.height ?? 16);
  const frameWidth = even(frameHeight * ratio);
  await ffmpeg(
    ["-i", src, "-vf", `fps=1/${interval.toFixed(4)},scale=${frameWidth}:${frameHeight},tile=${count}x1`, "-frames:v", "1", "-q:v", "5", dest],
    { signal },
  );
  return { count, interval, frameWidth, frameHeight };
}

/** Konwersja obrazu (logo) do PNG o rozsądnej wielkości. */
export async function normalizeImage(src: string, dest: string, maxSize = 1024, signal?: AbortSignal) {
  await ffmpeg(["-i", src, "-vf", `scale='min(${maxSize},iw)':-2`, "-frames:v", "1", dest], { signal });
  return dest;
}

/** Ekstrakcja audio do MP3 16 kHz mono (transkrypcja). */
export async function extractSpeechAudio(src: string, dest: string, signal?: AbortSignal) {
  await ffmpeg(["-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", dest], { signal });
  return dest;
}

export function tmpName(dir: string, name: string) {
  return path.join(dir, `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}_${name}`);
}
