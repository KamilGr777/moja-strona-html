import { ffmpeg } from "./ffmpeg";
import { round } from "../utils";

export interface AudioAnalysis {
  durationSec: number;
  integratedLufs: number | null;
  loudnessRange: number | null;
  truePeakDb: number | null;
  /** RMS w dBFS co 100 ms */
  energyDb: number[];
  energyStep: number;
  silences: Array<{ start: number; end: number }>;
  /** Udział ciszy w nagraniu 0..1 */
  silenceRatio: number;
  tempo: { bpm: number | null; confidence: number; beats: number[] };
  /** Momenty wyraźnego wzrostu energii (dobre miejsca na „wejście” muzyki / mocne cięcie) */
  energyRises: number[];
  /** Szczyty obwiedni co 50 ms (0..1) do rysowania waveformu */
  waveform: number[];
  waveformStep: number;
}

const SR = 22050;

export async function decodePcm(path: string, signal?: AbortSignal, sampleRate = SR): Promise<Float32Array> {
  const { stdout } = await ffmpeg(["-i", path, "-vn", "-ac", "1", "-ar", String(sampleRate), "-f", "f32le", "-"], {
    signal,
    captureStdout: true,
  });
  const buf = stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + stdout.byteLength - (stdout.byteLength % 4));
  return new Float32Array(buf);
}

export async function measureLoudness(path: string, signal?: AbortSignal) {
  const { stderr } = await ffmpeg(["-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { signal });
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const num = (re: RegExp) => {
    const m = re.exec(summary);
    const v = m ? Number(m[1]) : NaN;
    return Number.isFinite(v) && v > -70 ? v : null;
  };
  return {
    integratedLufs: num(/I:\s+(-?[\d.]+) LUFS/),
    loudnessRange: num(/LRA:\s+(-?[\d.]+) LU/),
    truePeakDb: num(/Peak:\s+(-?[\d.]+) dBFS/),
  };
}

// ───────────────── FFT (radix-2, in-place) ─────────────────
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Obwiednia onsetów metodą spectral flux (log-kompresja, rektyfikacja). */
export function onsetEnvelope(pcm: Float32Array, sampleRate = SR, frame = 1024, hop = 512) {
  const nFrames = Math.max(0, Math.floor((pcm.length - frame) / hop) + 1);
  const win = new Float64Array(frame).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1)));
  const bins = frame / 2;
  let prev = new Float64Array(bins);
  const env = new Float64Array(nFrames);
  const re = new Float64Array(frame);
  const im = new Float64Array(frame);
  for (let f = 0; f < nFrames; f++) {
    const off = f * hop;
    for (let i = 0; i < frame; i++) {
      re[i] = pcm[off + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float64Array(bins);
    let flux = 0;
    for (let b = 1; b < bins; b++) {
      mag[b] = Math.log1p(100 * Math.hypot(re[b], im[b]));
      const d = mag[b] - prev[b];
      if (d > 0) flux += d;
    }
    env[f] = flux;
    prev = mag;
  }
  // odjęcie lokalnej średniej (~0,5 s) i rektyfikacja
  const fps = sampleRate / hop;
  const w = Math.max(1, Math.round(fps * 0.25));
  const out = new Float64Array(nFrames);
  let max = 0;
  for (let i = 0; i < nFrames; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(nFrames - 1, i + w); j++) {
      s += env[j];
      c++;
    }
    out[i] = Math.max(0, env[i] - s / c);
    if (out[i] > max) max = out[i];
  }
  if (max > 0) for (let i = 0; i < nFrames; i++) out[i] /= max;
  return { env: out, fps };
}

/** Estymacja tempa (autokorelacja z priorytetem wokół 120 BPM) i pozycji beatów. */
export function estimateTempo(rawEnv: Float64Array, fps: number) {
  const n = rawEnv.length;
  // wygładzenie obwiedni (okno 5 ramek) — okres beatu rzadko trafia w całkowitą liczbę ramek
  const env = new Float64Array(n);
  const kernel = [0.1, 0.2, 0.4, 0.2, 0.1];
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = -2; k <= 2; k++) v += (rawEnv[Math.min(n - 1, Math.max(0, i + k))] ?? 0) * kernel[k + 2];
    env[i] = v;
  }
  if (n < fps * 4) return { bpm: null, confidence: 0, beats: [] as number[] };
  const minLag = Math.floor((60 * fps) / 190);
  const maxLag = Math.ceil((60 * fps) / 60);
  const ac = new Float64Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += env[i] * env[i + lag];
    ac[lag] = s / (n - lag);
  }
  let bestLag = -1;
  let bestVal = -Infinity;
  let sumW = 0;
  let cnt = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * fps) / lag;
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));
    const v = ac[lag] * prior;
    sumW += ac[lag];
    cnt++;
    if (v > bestVal) {
      bestVal = v;
      bestLag = lag;
    }
  }
  // kontrola oktawy: jeśli połowa okresu ma porównywalną autokorelację, wybieramy szybsze tempo
  const near = (l: number) => Math.max(ac[Math.floor(l)] ?? 0, ac[Math.ceil(l)] ?? 0, ac[Math.round(l) - 1] ?? 0, ac[Math.round(l) + 1] ?? 0);
  const half = bestLag / 2;
  if (half >= minLag && (60 * fps) / half <= 190 && near(half) > 0.6 * ac[bestLag]) {
    let hb = Math.round(half);
    for (let l = Math.floor(half) - 1; l <= Math.ceil(half) + 1; l++) if (l >= minLag && ac[l] > ac[hb]) hb = l;
    bestLag = hb;
  }
  const meanAc = sumW / Math.max(1, cnt);
  const confidence = meanAc > 0 ? Math.min(1, Math.max(0, (ac[bestLag] / meanAc - 1) / 3)) : 0;
  // interpolacja paraboliczna
  const y0 = ac[bestLag - 1] ?? ac[bestLag];
  const y1 = ac[bestLag];
  const y2 = ac[bestLag + 1] ?? ac[bestLag];
  const denom = y0 - 2 * y1 + y2;
  const lag = denom !== 0 ? bestLag + (0.5 * (y0 - y2)) / denom : bestLag;
  const period = lag;
  // faza: maksymalizacja sumy obwiedni na siatce
  let bestPhase = 0;
  let bestSum = -Infinity;
  for (let ph = 0; ph < period; ph += 0.5) {
    let s = 0;
    for (let k = ph; k < n; k += period) s += env[Math.round(k)] ?? 0;
    if (s > bestSum) {
      bestSum = s;
      bestPhase = ph;
    }
  }
  const beats: number[] = [];
  const tol = Math.max(1, Math.round(period * 0.1));
  for (let k = bestPhase; k < n; k += period) {
    const c = Math.round(k);
    let bi = c;
    for (let j = Math.max(0, c - tol); j <= Math.min(n - 1, c + tol); j++) if (rawEnv[j] > rawEnv[bi]) bi = j;
    beats.push(round(bi / fps, 3));
  }
  const bpm = round((60 * fps) / period, 1);
  return { bpm: confidence > 0.08 ? bpm : null, confidence: round(confidence, 3), beats: confidence > 0.08 ? beats : [] };
}

export function energyProfile(pcm: Float32Array, sampleRate = SR, step = 0.1) {
  const hop = Math.round(sampleRate * step);
  const out: number[] = [];
  for (let i = 0; i < pcm.length; i += hop) {
    let s = 0;
    const end = Math.min(pcm.length, i + hop);
    for (let j = i; j < end; j++) s += pcm[j] * pcm[j];
    const rms = Math.sqrt(s / Math.max(1, end - i));
    out.push(round(rms > 1e-6 ? 20 * Math.log10(rms) : -120, 1));
  }
  return out;
}

export function findSilences(energyDb: number[], step: number, thresholdDb = -45, minSec = 0.6) {
  const res: Array<{ start: number; end: number }> = [];
  let s: number | null = null;
  energyDb.forEach((e, i) => {
    if (e < thresholdDb) {
      if (s === null) s = i;
    } else if (s !== null) {
      if ((i - s) * step >= minSec) res.push({ start: round(s * step, 2), end: round(i * step, 2) });
      s = null;
    }
  });
  if (s !== null && (energyDb.length - s) * step >= minSec) res.push({ start: round(s * step, 2), end: round(energyDb.length * step, 2) });
  return res;
}

export function findEnergyRises(energyDb: number[], step: number) {
  const perSec = Math.round(1 / step);
  const rises: number[] = [];
  for (let i = perSec * 2; i < energyDb.length - perSec; i += Math.max(1, Math.round(perSec / 4))) {
    const before = energyDb.slice(i - perSec * 2, i);
    const after = energyDb.slice(i, i + perSec);
    const b = before.reduce((a, x) => a + Math.max(x, -80), 0) / before.length;
    const a = after.reduce((acc, x) => acc + Math.max(x, -80), 0) / after.length;
    if (a - b > 6 && a > -35 && (rises.length === 0 || i * step - rises[rises.length - 1] > 2)) rises.push(round(i * step, 2));
  }
  return rises;
}

export function waveformPeaks(pcm: Float32Array, sampleRate = SR, step = 0.05) {
  const hop = Math.round(sampleRate * step);
  const out: number[] = [];
  for (let i = 0; i < pcm.length; i += hop) {
    let p = 0;
    const end = Math.min(pcm.length, i + hop);
    for (let j = i; j < end; j++) {
      const v = Math.abs(pcm[j]);
      if (v > p) p = v;
    }
    out.push(round(Math.min(1, p), 3));
  }
  return out;
}

/** Pełna analiza ścieżki audio: głośność, cisza, tempo/beaty, wzrosty energii, waveform. */
export async function analyzeAudio(path: string, opts: { withTempo?: boolean; signal?: AbortSignal } = {}): Promise<AudioAnalysis> {
  const [pcm, loud] = await Promise.all([decodePcm(path, opts.signal), measureLoudness(path, opts.signal)]);
  const durationSec = pcm.length / SR;
  const energyStep = 0.1;
  const energyDb = energyProfile(pcm, SR, energyStep);
  const silences = findSilences(energyDb, energyStep);
  const silent = silences.reduce((a, s) => a + (s.end - s.start), 0);
  let tempo: AudioAnalysis["tempo"] = { bpm: null, confidence: 0, beats: [] };
  if (opts.withTempo !== false && durationSec >= 4) {
    const { env, fps } = onsetEnvelope(pcm, SR);
    tempo = estimateTempo(env, fps);
  }
  return {
    durationSec: round(durationSec, 3),
    ...loud,
    energyDb,
    energyStep,
    silences,
    silenceRatio: durationSec > 0 ? round(silent / durationSec, 3) : 0,
    tempo,
    energyRises: findEnergyRises(energyDb, energyStep),
    waveform: waveformPeaks(pcm, SR),
    waveformStep: 0.05,
  };
}
