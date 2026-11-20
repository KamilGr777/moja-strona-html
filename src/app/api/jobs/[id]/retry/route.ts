import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { retryJob } from "@/lib/queue";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const job = await db.job.findFirst({ where: { id, userId: user.id } });
  if (!job) throw new HttpError(404, "Nie znaleziono zadania.");
  if (!["FAILED", "CANCELLED"].includes(job.status)) throw new HttpError(409, "Ponowić można tylko zadanie zakończone błędem lub anulowane.");
  const p = job.payload as { assetId?: string; analysisId?: string; renderJobId?: string };
  if (p.assetId) await db.mediaAsset.updateMany({ where: { id: p.assetId, status: { in: ["FAILED", "PROCESSING"] } }, data: { status: "UPLOADED", error: null } });
  if (p.analysisId) await db.analysis.update({ where: { id: p.analysisId }, data: { status: "QUEUED", error: null } });
  if (p.renderJobId) await db.renderJob.update({ where: { id: p.renderJobId }, data: { status: "QUEUED", error: null, progress: 0 } });
  const fresh = await retryJob(id);
  return json({ job: fresh });
});
