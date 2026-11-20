import { HttpError, route } from "@/lib/http";
import { streamFile } from "@/lib/services/stream";
import { exportByToken } from "@/lib/services/review";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const GET = route(async (req, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const ex = await exportByToken(token);
  if (!ex) throw new HttpError(404, "Link wygasł lub jest nieprawidłowy.");
  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: ex.assetId } });
  return streamFile(req, asset.storageKey, "video/mp4", { cache: "private, no-store" });
});
