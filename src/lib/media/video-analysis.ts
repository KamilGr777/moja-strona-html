import { ffmpegText } from "./ffmpeg";
import { clamp, mean } from "../utils";

export interface FrameSample {
  t: number;
  /** Średnia luminancja 0–255 */
  yavg: number;
  /** Rozpiętość luminancji (kontrast) */
  yrange: number;
  /** Różnica względem poprzedniej próbki — przybliżenie ruchu */
  ydif: number;
  /** Średnie nasycenie */
  sat: number;
  /** Rozmycie wg blurdetect (większe = bardziej rozmyte) */
  blur: number;
}

export interface DetectedScene {
  index: number;
  start: number;
  end: number;
  cutScore: number | null;
}

export interface SceneStats {
  motion: number; // 0..1
  brightness: number; // 0..1
  sharpness: number; // 0..1
  saturation: number; // 0..1
  contrast: number; // 0..1
}

/** Parsuje wyjście `metadata=print:file=-` na listę ramek z kluczami. */
export function parseMetadataPrint(text: string): Array<{ t: number; values: Record<string, number> }> {
  const frames: Array<{ t: number; values: Record<string, number> }> = [];
  let cur: { t: number; values: Record<string, number> } | null = null;
  for (const line of text.split("\n")) {
    const fm = /pts_time:([\d.eE+-]+)/.exec(line);
    if (line.startsWith("frame:") && fm) {
      cur = { t: Number(fm[1]), values: {} };
      frames.push(cur);
      continue;
    }
    const kv = /^lavfi\.([\w.]+)=([-\d.eE+]+|nan|inf)/.exec(line.trim());
    if (kv && cur) {
      const v = Number(kv[2]);
      if (Number.isFinite(v)) cur.values[kv[1]] = v;
    }
  }
  return frames;
}

/** Wykrywanie cięć (zmian scen) filtrem `select=gt(scene,T)`. */
export async function detectScenes(path: string, durationSec: number, opts: { threshold?: number; minSceneSec?: number; signal?: AbortSignal } = {}): Promise<DetectedScene[]> {
  const threshold = opts.threshold ?? 0.3;
  const minLen = opts.minSceneSec ?? 0.4;
  const { stdout } = await ffmpegText(
    ["-i", path, "-vf", `scale=320:-2,select='gt(scene,${threshold})',metadata=print:file=-`, "-an", "-f", "null", "-"],
    { signal: opts.signal },
  );
  const cuts = parseMetadataPrint(stdout)
    .map((f) => ({ t: f.t, score: f.values["scene_score"] ?? null }))
    .filter((c) => c.t > minLen && c.t < durationSec - minLen * 0.5);
  return buildScenes(cuts, durationSec, minLen);
}

export function buildScenes(cuts: Array<{ t: number; score: number | null }>, durationSec: number, minLen = 0.4): DetectedScene[] {
  const merged: Array<{ t: number; score: number | null }> = [];
  for (const c of [...cuts].sort((a, b) => a.t - b.t)) {
    const last = merged[merged.length - 1];
    if (last && c.t - last.t < minLen) {
      if ((c.score ?? 0) > (last.score ?? 0)) merged[merged.length - 1] = c;
      continue;
    }
    merged.push(c);
  }
  const scenes: DetectedScene[] = [];
  let start = 0;
  merged.forEach((c) => {
    if (c.t - start >= minLen * 0.5) {
      scenes.push({ index: scenes.length, start, end: c.t, cutScore: c.score });
      start = c.t;
    }
  });
  if (durationSec - start > 0.05 || scenes.length === 0) scenes.push({ index: scenes.length, start, end: Math.max(durationSec, start + 0.05), cutScore: null });
  return scenes;
}

/** Statystyki obrazu co 1/fps s: jasność, kontrast, ruch, nasycenie, rozmycie. */
export async function sampleFrameStats(path: string, opts: { fps?: number; signal?: AbortSignal } = {}): Promise<FrameSample[]> {
  const fps = opts.fps ?? 4;
  const { stdout } = await ffmpegText(
    ["-i", path, "-vf", `fps=${fps},scale=320:-2,signalstats,blurdetect=block_width=32:block_height=32,metadata=print:file=-`, "-an", "-f", "null", "-"],
    { signal: opts.signal },
  );
  return parseMetadataPrint(stdout).map((f, i) => ({
    t: f.t,
    yavg: f.values["signalstats.YAVG"] ?? 0,
    yrange: (f.values["signalstats.YHIGH"] ?? 0) - (f.values["signalstats.YLOW"] ?? 0),
    ydif: i === 0 ? 0 : f.values["signalstats.YDIF"] ?? 0,
    sat: f.values["signalstats.SATAVG"] ?? 0,
    blur: f.values["blur"] ?? 0,
  }));
}

/** Normalizacja surowych wartości do 0..1 (progi dobrane empirycznie dla materiału 320px). */
export function normalizeSample(s: FrameSample) {
  return {
    motion: clamp(s.ydif / 18, 0, 1),
    brightness: clamp(s.yavg / 255, 0, 1),
    sharpness: clamp(1 - (s.blur - 2) / 8, 0, 1),
    saturation: clamp(s.sat / 90, 0, 1),
    contrast: clamp(s.yrange / 200, 0, 1),
  };
}

export function statsForRange(samples: FrameSample[], start: number, end: number): SceneStats {
  const inRange = samples.filter((s) => s.t >= start - 0.001 && s.t < end);
  const pool = inRange.length ? inRange : samples.filter((s) => Math.abs(s.t - (start + end) / 2) < 0.6);
  // pierwsza próbka po cięciu zawiera skok — pomijamy ją w ruchu
  const motionPool = pool.length > 1 ? pool.slice(1) : pool;
  const n = pool.map(normalizeSample);
  const nm = motionPool.map(normalizeSample);
  return {
    motion: mean(nm.map((x) => x.motion)),
    brightness: mean(n.map((x) => x.brightness)),
    sharpness: mean(n.map((x) => x.sharpness)),
    saturation: mean(n.map((x) => x.saturation)),
    contrast: mean(n.map((x) => x.contrast)),
  };
}

/** Wybiera najlepsze okno o długości `len` w zakresie [start,end] wg funkcji oceny próbek. */
export function bestWindow(
  samples: FrameSample[],
  start: number,
  end: number,
  len: number,
  score: (n: ReturnType<typeof normalizeSample>) => number,
): { start: number; end: number; score: number } {
  if (end - start <= len + 0.05) return { start, end, score: mean(samples.filter((s) => s.t >= start && s.t < end).map((s) => score(normalizeSample(s)))) };
  const step = 0.25;
  let best = { start, end: start + len, score: -Infinity };
  // unikamy pierwszych/ostatnich 0,15 s ujęcia (często zawierają mikroruch po cięciu)
  for (let s = start + 0.15; s + len <= end - 0.1 + 1e-6; s += step) {
    const pool = samples.filter((x) => x.t >= s && x.t < s + len);
    if (!pool.length) continue;
    const v = mean(pool.map((x) => score(normalizeSample(x))));
    if (v > best.score) best = { start: s, end: s + len, score: v };
  }
  if (best.score === -Infinity) best = { start, end: start + len, score: 0 };
  return best;
}
