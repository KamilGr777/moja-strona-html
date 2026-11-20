import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { ownedEditing } from "@/lib/services/guard";
import { loadDoc } from "@/lib/services/timeline-store";
import { editorAssets } from "@/lib/services/editor-data";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ep = await ownedEditing(user.id, id);
  const { doc } = await loadDoc(id);
  const ids = [...doc.video.map((v) => v.assetId), ...doc.audio.map((a) => a.assetId), ...doc.logos.map((l) => l.assetId), ...(ep.project.client?.logoAssetId ? [ep.project.client.logoAssetId] : [])];
  return json({ assets: await editorAssets(user.id, ep.projectId, ids) });
});
