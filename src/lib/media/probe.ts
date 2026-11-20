import { ffprobeJson, type FfprobeStream } from "./ffmpeg";

export interface MediaInfo {
  durationSec: number;
  hasVideo: boolean;
  hasAudio: boolean;
  /** Wymiary wyświetlane (po uwzględnieniu rotacji) */
  width: number | null;
  height: number | null;
  fps: number | null;
  rotation: number;
  videoCodec: string | null;
  audioCodec: string | null;
  pixFmt: string | null;
  bitrate: number | null;
  formatName: string | null;
  sampleRate: number | null;
  channels: number | null;
  aspectRatio: number | null;
  aspectLabel: string | null;
  subtitleStreams: Array<{ index: number; codec: string | null; language: string | null }>;
  creationTime: string | null;
}

function parseRate(r?: string): number | null {
  if (!r || r === "0/0") return null;
  const [a, b] = r.split("/").map(Number);
  if (!b) return a || null;
  const v = a / b;
  return Number.isFinite(v) && v > 0 && v < 1000 ? Math.round(v * 1000) / 1000 : null;
}

function rotationOf(s: FfprobeStream): number {
  const sd = s.side_data_list?.find((d) => typeof d.rotation === "number");
  let rot = sd?.rotation ?? (s.tags?.rotate ? Number(s.tags.rotate) : 0);
  rot = ((Math.round(rot) % 360) + 360) % 360;
  return rot;
}

export function aspectLabel(w: number, h: number): string {
  const r = w / h;
  const known: Array<[string, number]> = [
    ["9:16", 9 / 16],
    ["4:5", 4 / 5],
    ["1:1", 1],
    ["4:3", 4 / 3],
    ["16:9", 16 / 9],
    ["3:4", 3 / 4],
    ["21:9", 21 / 9],
  ];
  let best = known[0];
  for (const k of known) if (Math.abs(k[1] - r) < Math.abs(best[1] - r)) best = k;
  return Math.abs(best[1] - r) < 0.03 ? best[0] : `${(r).toFixed(2)}:1`;
}

export async function probeMedia(path: string, signal?: AbortSignal): Promise<MediaInfo> {
  const p = await ffprobeJson(path, { signal });
  const v = p.streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const a = p.streams.find((s) => s.codec_type === "audio");
  const subs = p.streams.filter((s) => s.codec_type === "subtitle");
  const rot = v ? rotationOf(v) : 0;
  let width = v?.width ?? null;
  let height = v?.height ?? null;
  if (width && height && (rot === 90 || rot === 270)) [width, height] = [height, width];
  const durations = [p.format.duration, v?.duration, a?.duration].map((d) => (d ? Number(d) : NaN)).filter((d) => Number.isFinite(d) && d > 0);
  const durationSec = durations.length ? Math.max(...durations.slice(0, 1)) : 0;
  return {
    durationSec,
    hasVideo: Boolean(v),
    hasAudio: Boolean(a),
    width,
    height,
    fps: v ? parseRate(v.avg_frame_rate) ?? parseRate(v.r_frame_rate) : null,
    rotation: rot,
    videoCodec: v?.codec_name ?? null,
    audioCodec: a?.codec_name ?? null,
    pixFmt: v?.pix_fmt ?? null,
    bitrate: p.format.bit_rate ? Number(p.format.bit_rate) : null,
    formatName: p.format.format_name ?? null,
    sampleRate: a?.sample_rate ? Number(a.sample_rate) : null,
    channels: a?.channels ?? null,
    aspectRatio: width && height ? width / height : null,
    aspectLabel: width && height ? aspectLabel(width, height) : null,
    subtitleStreams: subs.map((s) => ({ index: s.index, codec: s.codec_name ?? null, language: s.tags?.language ?? null })),
    creationTime: p.format.tags?.creation_time ?? null,
  };
}
