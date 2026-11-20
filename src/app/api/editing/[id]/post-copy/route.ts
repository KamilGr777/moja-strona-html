import { db } from "@/lib/db";
import { env, aiEnabled } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ownedEditing } from "@/lib/services/guard";
import { loadDoc } from "@/lib/services/timeline-store";
import { postCopyWithAi } from "@/lib/ai/features";
import { describeAiError } from "@/lib/ai/client";
import { postCopyFromTemplate } from "@/lib/analysis/templates";
import { storage } from "@/lib/storage";
import type { ClientProfile } from "@/lib/ai/prompts";
import type { ServiceKey } from "@/lib/constants";

/** Generator opisu posta (Instagram, CTA, hashtagi, TikTok) dopasowany do klienta i usługi. */
export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ep = await ownedEditing(user.id, id);
  const { doc } = await loadDoc(id);
  const client = ep.project.client;
  const service = (ep.project.service ?? "other") as ServiceKey;
  if (aiEnabled()) {
    await rateLimit(`ai:${user.id}`, env().RATE_LIMIT_AI_PER_HOUR, 3600, "zapytań AI");
    try {
      const analysis = await db.analysis.findFirst({ where: { projectId: ep.projectId, status: "COMPLETED" }, orderBy: { createdAt: "desc" } });
      const firstAsset = doc.video[0] ? await db.mediaAsset.findFirst({ where: { id: doc.video[0].assetId, userId: user.id } }) : null;
      const poster = firstAsset?.posterKey ? await storage().readBuffer(firstAsset.posterKey).catch(() => null) : null;
      const r = await postCopyWithAi({ service, client: client as ClientProfile | null, summary: analysis?.summary, captions: doc.texts.map((t) => t.text), poster });
      return json({ source: "ai", ...r.data });
    } catch (e) {
      return json({ source: "template", warning: `AI niedostępne (${describeAiError(e)})`, ...postCopyFromTemplate({ service, clientName: client?.name, cta: client?.defaultCta, instagram: client?.instagram }) });
    }
  }
  return json({ source: "template", ...postCopyFromTemplate({ service, clientName: client?.name, cta: client?.defaultCta, instagram: client?.instagram }) });
});
