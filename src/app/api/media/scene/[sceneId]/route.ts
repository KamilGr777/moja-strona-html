import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { streamFile } from "@/lib/services/stream";

export const runtime = "nodejs";

export const GET = route(async (req, ctx: { params: Promise<{ sceneId: string }> }) => {
  const user = await requireApiUser();
  const { sceneId } = await ctx.params;
  const s = await db.scene.findFirst({ where: { id: sceneId, asset: { userId: user.id } } });
  if (!s?.frameKey) throw new HttpError(404, "Brak klatki sceny.");
  return streamFile(req, s.frameKey, "image/jpeg", { cache: "private, max-age=86400" });
});
