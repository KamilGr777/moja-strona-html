import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { env, transcriptionEnabled } from "../env";
import { round } from "../utils";

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

export interface Transcript {
  language: string | null;
  text: string;
  segments: TranscriptSegment[];
  provider: string;
  hasWordTimestamps: boolean;
}

/** Transkrypcja pliku audio (MP3 16 kHz mono) — język polski. */
export async function transcribe(audioPath: string, signal?: AbortSignal): Promise<Transcript | null> {
  if (!transcriptionEnabled()) return null;
  const e = env();
  if (e.TRANSCRIPTION_PROVIDER === "whispercpp") return transcribeWhisperCpp(audioPath, signal);
  return transcribeOpenAiCompatible(audioPath, signal);
}

/** Dowolne API zgodne z POST /v1/audio/transcriptions (OpenAI Whisper, Groq, faster-whisper-server). */
async function transcribeOpenAiCompatible(audioPath: string, signal?: AbortSignal): Promise<Transcript> {
  const e = env();
  const form = new FormData();
  const buf = await fs.readFile(audioPath);
  form.append("file", new Blob([new Uint8Array(buf)], { type: "audio/mpeg" }), path.basename(audioPath));
  form.append("model", e.TRANSCRIPTION_MODEL);
  form.append("language", "pl");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  const res = await fetch(e.TRANSCRIPTION_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${e.TRANSCRIPTION_API_KEY}` },
    body: form,
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Transkrypcja nie powiodła się (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    language?: string;
    text?: string;
    segments?: Array<{ start: number; end: number; text: string }>;
    words?: Array<{ word: string; start: number; end: number }>;
  };
  const words: TranscriptWord[] = (data.words ?? []).map((w) => ({ text: w.word.trim(), start: round(w.start, 3), end: round(w.end, 3) }));
  const segments: TranscriptSegment[] = (data.segments ?? []).map((s) => ({
    start: round(s.start, 3),
    end: round(s.end, 3),
    text: s.text.trim(),
    words: words.filter((w) => w.start >= s.start - 0.05 && w.end <= s.end + 0.05),
  }));
  return {
    language: data.language ?? "pl",
    text: (data.text ?? "").trim(),
    segments: segments.length ? segments : words.length ? [{ start: words[0].start, end: words[words.length - 1].end, text: data.text ?? "", words }] : [],
    provider: `api:${e.TRANSCRIPTION_MODEL}`,
    hasWordTimestamps: words.length > 0,
  };
}

/** Lokalny whisper.cpp (offline). Wymaga WHISPER_CPP_BIN i WHISPER_CPP_MODEL. */
async function transcribeWhisperCpp(audioPath: string, signal?: AbortSignal): Promise<Transcript> {
  const e = env();
  const wav = audioPath.replace(/\.\w+$/, ".wav");
  await new Promise<void>((resolve, reject) => {
    const p = spawn(e.FFMPEG_PATH, ["-hide_banner", "-y", "-i", audioPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error("Konwersja audio dla whisper.cpp nie powiodła się"))));
  });
  const outBase = wav.replace(/\.wav$/, "");
  await new Promise<void>((resolve, reject) => {
    const p = spawn(e.WHISPER_CPP_BIN!, ["-m", e.WHISPER_CPP_MODEL!, "-l", "pl", "-f", wav, "-ojf", "-of", outBase, "-ml", "1", "-sow"], { stdio: "ignore" });
    signal?.addEventListener("abort", () => p.kill("SIGKILL"), { once: true });
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`whisper.cpp zakończył się kodem ${c}`))));
  });
  const json = JSON.parse(await fs.readFile(`${outBase}.json`, "utf8")) as {
    result?: { language?: string };
    transcription?: Array<{ offsets: { from: number; to: number }; text: string }>;
  };
  // z -ml 1 każdy wpis to jedno słowo
  const words: TranscriptWord[] = (json.transcription ?? [])
    .map((t) => ({ text: t.text.trim(), start: round(t.offsets.from / 1000, 3), end: round(t.offsets.to / 1000, 3) }))
    .filter((w) => w.text);
  const segments: TranscriptSegment[] = [];
  let cur: TranscriptSegment | null = null;
  for (const w of words) {
    if (!cur || w.start - cur.end > 0.8 || cur.words.length >= 12) {
      cur = { start: w.start, end: w.end, text: "", words: [] };
      segments.push(cur);
    }
    cur.words.push(w);
    cur.end = w.end;
    cur.text = cur.words.map((x) => x.text).join(" ");
  }
  return { language: json.result?.language ?? "pl", text: words.map((w) => w.text).join(" "), segments, provider: "whisper.cpp", hasWordTimestamps: true };
}
