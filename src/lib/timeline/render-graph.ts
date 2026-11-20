import { layoutVideo, clipDuration } from "./ops";
import type { TimelineDoc } from "./types";
import { round } from "../utils";

export interface RenderAsset {
  path: string;
  hasAudio: boolean;
  durationSec: number;
  width: number;
  height: number;
}

export type RenderQuality = "draft" | "standard" | "high";

export interface RenderOptions {
  outPath: string;
  /** Plik .ass z napisami (null = bez wypalania) */
  assPath: string | null;
  fontsDir: string;
  quality: RenderQuality;
  withLogo: boolean;
  loudnorm: boolean;
  /** Nadpisanie rozdzielczości (np. podgląd 540×960) */
  width?: number;
  height?: number;
  fps?: number;
}

const QUALITY: Record<RenderQuality, { preset: string; crf: number; audio: string }> = {
  draft: { preset: "veryfast", crf: 27, audio: "128k" },
  standard: { preset: "medium", crf: 20, audio: "192k" },
  high: { preset: "slow", crf: 17, audio: "256k" },
};

function even(n: number) {
  return Math.max(2, Math.ceil(n / 2) * 2);
}

function atempoChain(speed: number): string[] {
  const out: string[] = [];
  let s = speed;
  while (s > 2.0 + 1e-9) {
    out.push("atempo=2.0");
    s /= 2;
  }
  while (s < 0.5 - 1e-9) {
    out.push("atempo=0.5");
    s /= 0.5;
  }
  if (Math.abs(s - 1) > 1e-6) out.push(`atempo=${s.toFixed(5)}`);
  return out;
}

function q(path: string) {
  // Ścieżki w opcjach filtrów: generujemy je sami (katalog roboczy storage), więc
  // wystarcza cytowanie apostrofami; dwukropki (np. dyski Windows) są niedozwolone.
  const p = path.replace(/\\/g, "/");
  if (/[':\[\];,]/.test(p)) throw new Error(`Ścieżka zawiera niedozwolone znaki dla FFmpeg: ${p}`);
  return `'${p}'`;
}

/**
 * Buduje polecenie FFmpeg (filter_complex) dla dokumentu timeline.
 * Każdy klip: wejście z input-seekingiem z oryginału → zmiana prędkości → kadrowanie 9:16
 * (cover + zoom + przesunięcie) → normalizacja fps → dokładna długość → fade;
 * łączenie z przejściami (concat / xfade), rozmycia obszarów, napisy ASS, logo,
 * miks muzyki (z opcjonalnym duckingiem), normalizacja głośności, H.264 + AAC.
 */
export function buildRenderCommand(doc: TimelineDoc, assets: Record<string, RenderAsset>, opts: RenderOptions) {
  if (!doc.video.length) throw new Error("Projekt nie zawiera żadnych klipów wideo.");
  const W = even(opts.width ?? doc.settings.width);
  const H = even(opts.height ?? doc.settings.height);
  const FPS = opts.fps ?? doc.settings.fps;
  const scaleK = W / doc.settings.width;
  const { entries, total } = layoutVideo(doc);
  const TOTAL = round(total, 3);

  const args: string[] = [];
  const filters: string[] = [];
  let inputIdx = 0;

  // ── klipy wideo ──
  const vLabels: string[] = [];
  const aLabels: string[] = [];
  doc.video.forEach((v, i) => {
    const a = assets[v.assetId];
    if (!a) throw new Error(`Brak pliku źródłowego dla klipu ${i + 1}.`);
    const srcLen = Math.max(0.05, Math.min(v.sourceOut, a.durationSec) - v.sourceIn);
    const D = round(clipDuration({ ...v, sourceOut: v.sourceIn + srcLen }), 4);
    args.push("-ss", v.sourceIn.toFixed(3), "-t", (srcLen + 0.05).toFixed(3), "-i", a.path);
    const k = inputIdx++;

    const s = Math.max(W / a.width, H / a.height) * v.crop.zoom;
    const SW = even(a.width * s);
    const SH = even(a.height * s);
    const cx = Math.round((SW - W) * v.crop.x);
    const cy = Math.round((SH - H) * v.crop.y);
    const vf = [
      `setpts=(PTS-STARTPTS)/${v.speed}`,
      `scale=${SW}:${SH}:flags=lanczos`,
      `crop=${W}:${H}:${cx}:${cy}`,
      "setsar=1",
      `fps=${FPS}`,
      "format=yuv420p",
      "tpad=stop_mode=clone:stop_duration=1",
      `trim=duration=${D}`,
      "setpts=PTS-STARTPTS",
      "settb=AVTB",
    ];
    if (v.fadeIn > 0) vf.push(`fade=t=in:st=0:d=${Math.min(v.fadeIn, D / 2).toFixed(3)}`);
    if (v.fadeOut > 0) vf.push(`fade=t=out:st=${Math.max(0, D - Math.min(v.fadeOut, D / 2)).toFixed(3)}:d=${Math.min(v.fadeOut, D / 2).toFixed(3)}`);
    filters.push(`[${k}:v]${vf.join(",")}[v${i}]`);
    vLabels.push(`v${i}`);

    const useAudio = a.hasAudio && !doc.settings.muteOriginal && v.volume > 0;
    if (useAudio) {
      const af = [
        "asetpts=PTS-STARTPTS",
        "aresample=48000",
        "aformat=sample_fmts=fltp:channel_layouts=stereo",
        ...atempoChain(v.speed),
        `volume=${v.volume.toFixed(3)}`,
        "apad",
        `atrim=duration=${D}`,
        "asetpts=PTS-STARTPTS",
      ];
      if (v.fadeIn > 0) af.push(`afade=t=in:st=0:d=${Math.min(v.fadeIn, D / 2).toFixed(3)}`);
      if (v.fadeOut > 0) af.push(`afade=t=out:st=${Math.max(0, D - Math.min(v.fadeOut, D / 2)).toFixed(3)}:d=${Math.min(v.fadeOut, D / 2).toFixed(3)}`);
      filters.push(`[${k}:a]${af.join(",")}[a${i}]`);
    } else {
      filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${D},asetpts=PTS-STARTPTS[a${i}]`);
    }
    aLabels.push(`a${i}`);
  });

  // ── łączenie z przejściami ──
  let curV = vLabels[0];
  let curA = aLabels[0];
  let curLen = entries[0].duration;
  for (let i = 1; i < vLabels.length; i++) {
    const e = entries[i];
    const nv = `vj${i}`;
    const na = `aj${i}`;
    if (e.transition > 0.01) {
      const type = doc.video[i].transition.type === "fadeblack" ? "fadeblack" : "fade";
      const td = round(e.transition, 3);
      filters.push(`[${curV}][${vLabels[i]}]xfade=transition=${type}:duration=${td}:offset=${round(curLen - td, 3)},fps=${FPS},settb=AVTB[${nv}]`);
      filters.push(`[${curA}][${aLabels[i]}]acrossfade=d=${td}:c1=tri:c2=tri[${na}]`);
      curLen = curLen - td + e.duration;
    } else {
      filters.push(`[${curV}][${vLabels[i]}]concat=n=2:v=1:a=0,fps=${FPS},settb=AVTB[${nv}]`);
      filters.push(`[${curA}][${aLabels[i]}]concat=n=2:v=0:a=1[${na}]`);
      curLen += e.duration;
    }
    curV = nv;
    curA = na;
  }

  // ── rozmycie obszarów (RODO: tablice rejestracyjne, twarze) ──
  doc.blurs.forEach((b, i) => {
    const bw = even(b.w * W);
    const bh = even(b.h * H);
    const bx = Math.round(b.x * W);
    const by = Math.round(b.y * H);
    const r = Math.max(2, Math.min(Math.round(b.strength * scaleK), Math.floor(Math.min(bw, bh) / 2) - 1));
    filters.push(`[${curV}]split[bb${i}a][bb${i}b]`);
    filters.push(`[bb${i}b]crop=${bw}:${bh}:${bx}:${by},boxblur=luma_radius=${r}:luma_power=2:chroma_radius=${Math.max(1, Math.floor(r / 2))}[bb${i}c]`);
    filters.push(`[bb${i}a][bb${i}c]overlay=${bx}:${by}:enable='between(t,${b.start.toFixed(3)},${b.end.toFixed(3)})'[vb${i}]`);
    curV = `vb${i}`;
  });

  // ── napisy (libass) ──
  if (opts.assPath && doc.texts.length) {
    filters.push(`[${curV}]ass=filename=${q(opts.assPath)}:fontsdir=${q(opts.fontsDir)}[vsub]`);
    curV = "vsub";
  }

  // ── logo ──
  if (opts.withLogo) {
    doc.logos.forEach((l, i) => {
      const a = assets[l.assetId];
      if (!a) return;
      args.push("-loop", "1", "-t", String(TOTAL + 1), "-i", a.path);
      const k = inputIdx++;
      const lw = even(l.width * W);
      filters.push(`[${k}:v]format=rgba,scale=${lw}:-2,colorchannelmixer=aa=${l.opacity.toFixed(3)}[lg${i}]`);
      filters.push(
        `[${curV}][lg${i}]overlay=x=${Math.round(l.position.x * W)}-overlay_w/2:y=${Math.round(l.position.y * H)}-overlay_h/2:enable='between(t,${l.start.toFixed(3)},${l.end.toFixed(3)})'[vl${i}]`,
      );
      curV = `vl${i}`;
    });
  }
  filters.push(`[${curV}]format=yuv420p[vout]`);

  // ── muzyka ──
  const music: string[] = [];
  doc.audio.forEach((m, i) => {
    const a = assets[m.assetId];
    if (!a || m.start >= TOTAL) return;
    const len = Math.max(0.1, Math.min(m.sourceOut, a.durationSec) - m.sourceIn);
    const playable = Math.min(len, TOTAL - m.start);
    args.push("-ss", m.sourceIn.toFixed(3), "-t", (playable + 0.05).toFixed(3), "-i", a.path);
    const k = inputIdx++;
    const fo = Math.min(m.fadeOut, playable / 2);
    const fi = Math.min(m.fadeIn, playable / 2);
    const af = [
      "asetpts=PTS-STARTPTS",
      "aresample=48000",
      "aformat=sample_fmts=fltp:channel_layouts=stereo",
      `volume=${m.volume.toFixed(3)}`,
      `atrim=duration=${playable.toFixed(3)}`,
    ];
    if (fi > 0) af.push(`afade=t=in:st=0:d=${fi.toFixed(3)}`);
    if (fo > 0) af.push(`afade=t=out:st=${(playable - fo).toFixed(3)}:d=${fo.toFixed(3)}`);
    if (m.start > 0) af.push(`adelay=delays=${Math.round(m.start * 1000)}:all=1`);
    af.push("apad");
    filters.push(`[${k}:a]${af.join(",")}[m${i}]`);
    music.push(`m${i}`);
  });

  let mix = curA;
  if (music.length) {
    let musicBus = music[0];
    if (music.length > 1) {
      filters.push(`${music.map((m) => `[${m}]`).join("")}amix=inputs=${music.length}:duration=longest:normalize=0[mbus]`);
      musicBus = "mbus";
    }
    const hasOriginal = !doc.settings.muteOriginal && doc.video.some((v) => assets[v.assetId]?.hasAudio && v.volume > 0);
    if (doc.settings.ducking && hasOriginal) {
      filters.push(`[${curA}]asplit=2[orig][sc]`);
      filters.push(`[${musicBus}][sc]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=400[mduck]`);
      filters.push(`[orig][mduck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[amix]`);
    } else {
      filters.push(`[${curA}][${musicBus}]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[amix]`);
    }
    mix = "amix";
  }
  const post = [`atrim=duration=${TOTAL}`];
  if (opts.loudnorm) post.push("loudnorm=I=-14:TP=-1.5:LRA=11", "aresample=48000");
  post.push("aformat=sample_fmts=fltp:channel_layouts=stereo");
  filters.push(`[${mix}]${post.join(",")}[aout]`);

  const qp = QUALITY[opts.quality];
  args.push(
    "-filter_complex", filters.join(";\n"),
    "-map", "[vout]",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-preset", qp.preset,
    "-crf", String(qp.crf),
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    "-g", String(Math.round(FPS * 2)),
    "-c:a", "aac",
    "-b:a", qp.audio,
    "-ar", "48000",
    "-ac", "2",
    "-movflags", "+faststart",
    "-t", String(TOTAL),
    opts.outPath,
  );

  return { args, durationSec: TOTAL, width: W, height: H, fps: FPS, filterGraph: filters.join(";\n") };
}
