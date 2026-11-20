import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { ownedEditing } from "@/lib/services/guard";
import { loadDoc, cloneDocWithNewIds } from "@/lib/services/timeline-store";
import { createEditing } from "@/lib/services/editing";
import { uid } from "@/lib/utils";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ep = await ownedEditing(user.id, id);
  const { doc } = await loadDoc(id);
  const copy = await createEditing(ep.projectId, `${ep.name} (kopia)`, "MANUAL", cloneDocWithNewIds(doc, uid), ep.changelog);
  return json({ editingProjectId: copy.id }, { status: 201 });
});
