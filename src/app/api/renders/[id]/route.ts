import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const rj = await db.renderJob.findFirst({ where: { id, editingProject: { project: { userId: user.id } } }, select: { id: true, status: true, progress: true, error: true, outputAssetId: true, options: true, createdAt: true, finishedAt: true, export: { select: { id: true, checklist: true } } } });
  if (!rj) throw new HttpError(404, "Nie znaleziono renderu.");
  return json({ render: rj });
});
