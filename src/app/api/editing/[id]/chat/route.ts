import { z } from "zod";
import { db } from "@/lib/db";
import { env, aiEnabled } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ownedEditing } from "@/lib/services/guard";
import { assetMapForUser } from "@/lib/services/montage";
import { TimelineDocSchema } from "@/lib/timeline/types";
import { describeOp } from "@/lib/timeline/ops";
import { chatWithAi } from "@/lib/ai/features";
import { describeAiError } from "@/lib/ai/client";
import { ruleBasedChat } from "@/lib/montage/chat-rules";
import { sceneInterest } from "@/lib/analysis/heuristics";
import type { ClientProfile } from "@/lib/ai/prompts";

const Body = z.object({
  message: z.string().trim().min(1).max(1000),
  doc: TimelineDocSchema,
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(20).default([]),
});

/** Asystent montażysty: odpowiedź + rzeczywiste operacje na projekcie (do zatwierdzenia przez użytkownika). */
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ep = await ownedEditing(user.id, id);
  const body = Body.parse(await readJson(req));
  const projectAssets = await db.mediaAsset.findMany({ where: { userId: user.id, OR: [{ projectId: ep.projectId }, { id: { in: body.doc.video.map((v) => v.assetId) } }], kind: "VIDEO", status: "READY" }, include: { scenes: true } });
  const assets = await assetMapForUser(user.id, projectAssets.map((a) => a.id));
  const scenes = projectAssets.flatMap((a) =>
    a.scenes.map((s) => ({
      assetId: a.id,
      start: s.start,
      end: s.end,
      description: s.description,
      category: s.category,
      score: s.interestScore ?? sceneInterest({ motion: s.motion ?? 0, sharpness: s.sharpness ?? 0.5, contrast: 0.5, saturation: s.saturation ?? 0.5, brightness: s.brightness ?? 0.5 }),
    })),
  );
  const analysis = await db.analysis.findFirst({ where: { projectId: ep.projectId, status: "COMPLETED" }, orderBy: { createdAt: "desc" } });
  const missing = ((analysis?.missingShots as { items?: Array<{ name: string }> } | null)?.items ?? []).map((m) => m.name);
  const client = ep.project.client as ClientProfile | null;

  if (aiEnabled()) {
    await rateLimit(`chat:${user.id}`, env().RATE_LIMIT_AI_PER_HOUR * 3, 3600, "zapytań do asystenta");
    try {
      const r = await chatWithAi({ message: body.message, history: body.history, doc: body.doc, assets, scenes, analysisSummary: analysis?.summary, client });
      await db.usageEvent.create({ data: { userId: user.id, kind: "ai_chat", units: r.usage.input + r.usage.output } });
      return json({ mode: "ai", reply: r.reply, cannotDo: r.cannotDo, operations: r.operations, summary: r.operations.map((o) => describeOp(o, body.doc)), rejected: r.rejected, warning: r.rejected.length ? `Pominięto ${r.rejected.length} nieprawidłowych operacji (np. odwołanie do nieistniejącego klipu).` : undefined });
    } catch (e) {
      const fallback = ruleBasedChat(body.message, body.doc, { scenes, cta: ep.project.client?.defaultCta, missingShots: missing });
      return json({ mode: "rules", ...fallback, summary: fallback.operations.map((o) => describeOp(o, body.doc)), warning: `AI niedostępne (${describeAiError(e)}) — użyto trybu prostych poleceń.` });
    }
  }
  const r = ruleBasedChat(body.message, body.doc, { scenes, cta: ep.project.client?.defaultCta, missingShots: missing });
  return json({ mode: "rules", ...r, summary: r.operations.map((o) => describeOp(o, body.doc)) });
});
