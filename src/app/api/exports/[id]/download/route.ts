import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { streamFile } from "@/lib/services/stream";

export const runtime = "nodejs";

export const GET = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ex = await db.export.findFirst({ where: { id, editingProject: { project: { userId: user.id } } }, include: { editingProject: { include: { project: true } } } });
  if (!ex) throw new HttpError(404, "Nie znaleziono eksportu.");
  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: ex.assetId } });
  const name = `${ex.editingProject.project.name}-${ex.platform}-${ex.width}x${ex.height}.mp4`.replace(/[^\p{L}\p{N}._-]+/gu, "_");
  return streamFile(req, asset.storageKey, "video/mp4", { filename: name });
});
