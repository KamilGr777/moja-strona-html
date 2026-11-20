import { Queue } from "bullmq";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { redis } from "./redis";

export const QUEUE_NAME = "detail-reel";

export type JobType = "ingest" | "analyze" | "clips" | "render" | "cleanup";

export interface JobPayloads {
  ingest: { assetId: string };
  analyze: { analysisId: string };
  clips: { projectId: string; generate?: { variants: boolean } };
  render: { renderJobId: string };
  cleanup: Record<string, never>;
}

const g = globalThis as unknown as { drQueue?: Queue };

export function queue(): Queue {
  if (!g.drQueue) {
    g.drQueue = new Queue(QUEUE_NAME, {
      connection: redis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    });
  }
  return g.drQueue;
}

/** Tworzy rekord Job (status widoczny w UI) i dodaje zadanie do kolejki BullMQ. */
export async function enqueue<T extends JobType>(
  type: T,
  payload: JobPayloads[T],
  opts: { userId: string; projectId?: string | null; stage?: string },
) {
  const job = await db.job.create({
    data: {
      type,
      userId: opts.userId,
      projectId: opts.projectId ?? null,
      payload: payload as Prisma.InputJsonValue,
      stage: opts.stage ?? "W kolejce",
    },
  });
  await queue().add(type, { jobId: job.id, ...payload }, { jobId: job.id });
  return job;
}

/** Ponowienie nieudanego / anulowanego zadania z tym samym payloadem. */
export async function retryJob(jobId: string) {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const fresh = await db.job.create({
    data: {
      type: job.type,
      userId: job.userId,
      projectId: job.projectId,
      payload: job.payload as Prisma.InputJsonValue,
      stage: "W kolejce (ponowienie)",
    },
  });
  await queue().add(job.type, { jobId: fresh.id, ...(job.payload as object) }, { jobId: fresh.id });
  return fresh;
}

export async function cancelJob(jobId: string) {
  const job = await db.job.update({ where: { id: jobId }, data: { cancelRequested: true } });
  const qj = await queue().getJob(jobId);
  if (qj) {
    const state = await qj.getState();
    if (state === "waiting" || state === "delayed" || state === "prioritized") {
      await qj.remove();
      await db.job.update({ where: { id: jobId }, data: { status: "CANCELLED", stage: "Anulowano", finishedAt: new Date() } });
    }
  }
  return job;
}
