import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { streamFile } from "@/lib/services/stream";

export const GET = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ex = await db.export.findFirst({ where: { id, editingProject: { project: { userId: user.id } } }, include: { editingProject: { include: { project: true } } } });
  if (!ex?.srtKey) throw new HttpError(404, "Ten eksport nie zawiera napisów.");
  return streamFile(req, ex.srtKey, "application/x-subrip; charset=utf-8", { filename: `${ex.editingProject.project.name}.srt`.replace(/[^\p{L}\p{N}._-]+/gu, "_") });
});
