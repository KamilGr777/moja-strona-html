import { db } from "../lib/db";
import { CancelledError } from "../lib/media/ffmpeg";

/** Kontekst zadania: raportowanie postępu do bazy i anulowanie (AbortSignal dla FFmpeg/AI). */
export class JobContext {
  readonly controller = new AbortController();
  private lastWrite = 0;
  private lastStage: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(readonly jobId: string) {}

  get signal() {
    return this.controller.signal;
  }

  startCancelWatch() {
    this.timer = setInterval(async () => {
      try {
        const j = await db.job.findUnique({ where: { id: this.jobId }, select: { cancelRequested: true } });
        if (j?.cancelRequested) this.controller.abort();
      } catch {
        /* chwilowy brak bazy */
      }
    }, 1500);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  throwIfCancelled() {
    if (this.signal.aborted) throw new CancelledError();
  }

  /** Postęp 0–100 (zapis throttlowany, zmiana etapu zapisywana od razu). */
  async progress(pct: number, stage?: string) {
    const now = Date.now();
    const stageChanged = stage !== undefined && stage !== this.lastStage;
    if (!stageChanged && now - this.lastWrite < 700) return;
    this.lastWrite = now;
    if (stage) this.lastStage = stage;
    await db.job
      .update({ where: { id: this.jobId }, data: { progress: Math.max(0, Math.min(100, Math.round(pct * 10) / 10)), ...(stage ? { stage } : {}) } })
      .catch(() => undefined);
    this.throwIfCancelled();
  }

  /** Podzakres postępu, np. ingest w 0–40% analizy. */
  scoped(from: number, to: number) {
    return async (fraction: number, stage?: string) => this.progress(from + (to - from) * Math.max(0, Math.min(1, fraction)), stage);
  }
}

export type ProgressFn = (fraction: number, stage?: string) => Promise<void>;
