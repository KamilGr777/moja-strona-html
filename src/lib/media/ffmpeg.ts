import { spawn } from "node:child_process";
import { env } from "../env";

export class FfmpegError extends Error {
  constructor(message: string, public stderrTail: string) {
    super(message);
  }
}

export class CancelledError extends Error {
  constructor() {
    super("Zadanie zostało anulowane");
  }
}

interface RunOptions {
  signal?: AbortSignal;
  /** Raportuje postęp 0..1 na podstawie -progress (wymaga durationSec). */
  onProgress?: (fraction: number) => void;
  durationSec?: number;
  /** Zbiera stdout jako bufor (np. surowe PCM). */
  captureStdout?: boolean;
  /** Maksymalny rozmiar stdout (bajty) */
  maxStdout?: number;
  cwd?: string;
}

interface RunResult {
  stdout: Buffer;
  stderr: string;
}

function spawnCapture(bin: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new CancelledError());
    const child = spawn(bin, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let outLen = 0;
    let errTail = "";
    let progressBuf = "";
    const max = opts.maxStdout ?? 512 * 1024 * 1024;

    const onAbort = () => child.kill("SIGKILL");
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      if (opts.onProgress && opts.durationSec) {
        progressBuf += chunk.toString();
        const lines = progressBuf.split("\n");
        progressBuf = lines.pop() ?? "";
        for (const line of lines) {
          const m = /^out_time_(?:us|ms)=(\d+)/.exec(line);
          if (m) {
            const sec = Number(m[1]) / 1_000_000;
            opts.onProgress(Math.max(0, Math.min(1, sec / opts.durationSec)));
          }
        }
      }
      if (opts.captureStdout && outLen < max) {
        out.push(chunk);
        outLen += chunk.length;
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errTail = (errTail + chunk.toString()).slice(-64 * 1024);
    });
    child.on("error", (e) => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(new FfmpegError(`Nie można uruchomić ${bin}: ${e.message}`, errTail));
    });
    child.on("close", (code) => {
      opts.signal?.removeEventListener("abort", onAbort);
      if (opts.signal?.aborted) return reject(new CancelledError());
      if (code !== 0) {
        const lastLines = errTail.trim().split("\n").slice(-6).join("\n");
        return reject(new FfmpegError(`${bin} zakończył się kodem ${code}: ${lastLines}`, errTail));
      }
      resolve({ stdout: Buffer.concat(out), stderr: errTail });
    });
  });
}

/** Uruchamia ffmpeg z bezpiecznymi domyślnymi flagami. */
export function ffmpeg(args: string[], opts: RunOptions = {}) {
  const base = ["-hide_banner", "-nostdin", "-y"];
  const progress = opts.onProgress ? ["-progress", "pipe:1", "-nostats"] : [];
  return spawnCapture(env().FFMPEG_PATH, [...base, ...progress, ...args], { ...opts, captureStdout: opts.captureStdout || false });
}

/** Uruchamia ffmpeg i zwraca stdout (np. metadata=print:file=-) jako tekst. */
export async function ffmpegText(args: string[], opts: RunOptions = {}) {
  const r = await spawnCapture(env().FFMPEG_PATH, ["-hide_banner", "-nostdin", "-y", ...args], { ...opts, captureStdout: true });
  return { stdout: r.stdout.toString("utf8"), stderr: r.stderr };
}

export async function ffprobeJson(path: string, opts: RunOptions = {}): Promise<FfprobeOutput> {
  const r = await spawnCapture(
    env().FFPROBE_PATH,
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
    { ...opts, captureStdout: true },
  );
  return JSON.parse(r.stdout.toString("utf8")) as FfprobeOutput;
}

export interface FfprobeStream {
  index: number;
  codec_type: "video" | "audio" | "subtitle" | "data" | "attachment";
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
  duration?: string;
  bit_rate?: string;
  pix_fmt?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ side_data_type?: string; rotation?: number }>;
  disposition?: Record<string, number>;
}

export interface FfprobeOutput {
  streams: FfprobeStream[];
  format: { format_name?: string; duration?: string; bit_rate?: string; size?: string; tags?: Record<string, string> };
}

/** Escape ścieżki dla parametrów filtrów (subtitles=..., movie=...). */
export function escapeFilterPath(p: string) {
  return p.replace(/\\/g, "\\\\\\\\").replace(/:/g, "\\\\:").replace(/'/g, "\\\\\\'").replace(/,/g, "\\,").replace(/\[/g, "\\[").replace(/]/g, "\\]");
}
