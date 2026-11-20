import fs from "node:fs";
if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env");

import { Worker, UnrecoverableError, type Job as BullJob } from "bullmq";
import type { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { env } from "../lib/env";
import { redis } from "../lib/redis";
import { QUEUE_NAME, queue } from "../lib/queue";
import { CancelledError } from "../lib/media/ffmpeg";
import { JobContext } from "./context";
import { ingestAsset, UserFacingError } from "./jobs/ingest";
import { runAnalysisJob } from "./jobs/analyze";
import { runClipsJob } from "./jobs/clips";
import { runRenderJob } from "./jobs/render";
import { runCleanup } from "./jobs/cleanup";

type Data = { jobId?: string; assetId?: string; analysisId?: string; projectId?: string; renderJobId?: string };

async function handle(job: BullJob<Data>) {
  if (job.name === "cleanup") return runCleanup();
  const jobId = job.data.jobId;
  if (!jobId) throw new UnrecoverableError("Brak identyfikatora zadania");
  const row = await db.job.findUnique({ where: { id: jobId } });
  if (!row) return null;
  if (row.cancelRequested || row.status === "CANCELLED") {
    await db.job.update({ where: { id: jobId }, data: { status: "CANCELLED", stage: "Anulowano", finishedAt: new Date() } });
    return null;
  }
  await db.job.update({ where: { id: jobId }, data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, error: null } });
  const ctx = new JobContext(jobId);
  ctx.startCancelWatch();
  const started = Date.now();
  try {
    let result: unknown = null;
    switch (job.name) {
      case "ingest":
        await ingestAsset(job.data.assetId!, ctx.scoped(0, 100), ctx.signal);
        break;
      case "analyze":
        result = await runAnalysisJob(job.data.analysisId!, ctx);
        break;
      case "clips":
        result = await runClipsJob(job.data.projectId!, ctx);
        break;
      case "render":
        result = await runRenderJob(job.data.renderJobId!, ctx);
        break;
      default:
        throw new UnrecoverableError(`Nieznany typ zadania: ${job.name}`);
    }
    await db.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED", progress: 100, stage: "Zakończono", result: (result ?? undefined) as Prisma.InputJsonValue | undefined, finishedAt: new Date() },
    });
    console.log(`[worker] ${job.name} ${jobId} OK (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    return result;
  } catch (err) {
    const cancelled = err instanceof CancelledError || ctx.signal.aborted;
    const attempts = job.opts.attempts ?? 1;
    const willRetry = !cancelled && !(err instanceof UserFacingError) && job.attemptsMade + 1 < attempts;
    const message = cancelled ? "Zadanie anulowane przez użytkownika." : (err as Error).message.slice(0, 600);
    await db.job.update({
      where: { id: jobId },
      data: willRetry
        ? { status: "QUEUED", stage: `Błąd — ponawianie (próba ${job.attemptsMade + 2} z ${attempts})`, error: message }
        : { status: cancelled ? "CANCELLED" : "FAILED", stage: cancelled ? "Anulowano" : "Błąd", error: message, finishedAt: new Date() },
    });
    console.error(`[worker] ${job.name} ${jobId} ${cancelled ? "ANULOWANE" : "BŁĄD"}:`, (err as Error).message);
    if (cancelled || err instanceof UserFacingError) throw new UnrecoverableError(message);
    throw err;
  } finally {
    ctx.stop();
  }
}

async function main() {
  const e = env();
  const worker = new Worker<Data>(QUEUE_NAME, handle, {
    connection: redis(),
    concurrency: e.WORKER_CONCURRENCY,
    lockDuration: 120_000,
    stalledInterval: 60_000,
  });
  worker.on("error", (err) => console.error("[worker] błąd:", err.message));
  // codzienne czyszczenie danych po okresie retencji
  await queue().add("cleanup", {}, { repeat: { pattern: "17 3 * * *" }, jobId: "cleanup-daily", removeOnComplete: true, attempts: 1 });
  console.log(`[worker] DETAIL REEL AI worker uruchomiony (równoległość: ${e.WORKER_CONCURRENCY}, AI: ${e.ANTHROPIC_API_KEY ? "włączone" : "tryb heurystyczny"})`);
  const shutdown = async () => {
    console.log("[worker] zatrzymywanie…");
    await worker.close();
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
