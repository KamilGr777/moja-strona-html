import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { cancelJob } from "@/lib/queue";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const job = await db.job.findFirst({ where: { id, userId: user.id } });
  if (!job) throw new HttpError(404, "Nie znaleziono zadania.");
  if (!["QUEUED", "RUNNING"].includes(job.status)) throw new HttpError(409, "To zadanie już się zakończyło.");
  await cancelJob(id);
  return json({ ok: true });
});
