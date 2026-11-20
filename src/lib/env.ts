import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  APP_URL: z.string().default("http://localhost:3000"),
  APP_SECRET: z.string().min(16).default("dev-secret-change-me-dev-secret-change-me"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_DIR: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().default(1024),
  MAX_VIDEO_DURATION_SEC: z.coerce.number().default(600),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  AI_MAX_FRAMES: z.coerce.number().int().min(4).max(60).default(24),
  TRANSCRIPTION_PROVIDER: z.enum(["openai", "whispercpp", "none"]).default("none"),
  TRANSCRIPTION_API_URL: z.string().default("https://api.openai.com/v1/audio/transcriptions"),
  TRANSCRIPTION_API_KEY: z.string().optional(),
  TRANSCRIPTION_MODEL: z.string().default("whisper-1"),
  WHISPER_CPP_BIN: z.string().optional(),
  WHISPER_CPP_MODEL: z.string().optional(),
  MUSIC_LIBRARY_DIR: z.string().optional(),
  RATE_LIMIT_AI_PER_HOUR: z.coerce.number().default(40),
  RATE_LIMIT_UPLOADS_PER_HOUR: z.coerce.number().default(200),
  RATE_LIMIT_RENDERS_PER_HOUR: z.coerce.number().default(60),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Zwalidowana konfiguracja środowiska (leniwie, żeby build nie wymagał zmiennych). */
export function env(): Env {
  if (cached) return cached;
  const raw = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Nieprawidłowa konfiguracja środowiska: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function aiEnabled(): boolean {
  return Boolean(env().ANTHROPIC_API_KEY);
}

export function transcriptionEnabled(): boolean {
  const e = env();
  if (e.TRANSCRIPTION_PROVIDER === "openai") return Boolean(e.TRANSCRIPTION_API_KEY);
  if (e.TRANSCRIPTION_PROVIDER === "whispercpp") return Boolean(e.WHISPER_CPP_BIN && e.WHISPER_CPP_MODEL);
  return false;
}

/** Status integracji pokazywany w Ustawieniach (bez ujawniania kluczy). */
export function integrationStatus() {
  const e = env();
  return {
    ai: { enabled: aiEnabled(), model: e.ANTHROPIC_MODEL },
    transcription: { enabled: transcriptionEnabled(), provider: e.TRANSCRIPTION_PROVIDER, model: e.TRANSCRIPTION_MODEL },
    storage: { driver: e.STORAGE_DRIVER },
    musicLibrary: { configured: Boolean(e.MUSIC_LIBRARY_DIR) },
  };
}
