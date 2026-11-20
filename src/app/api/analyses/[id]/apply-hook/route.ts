import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { ownedAnalysis } from "@/lib/services/guard";
import { createEditing, docFromScenes } from "@/lib/services/editing";
import { loadDoc, saveDoc } from "@/lib/services/timeline-store";
import { makeText, newVideoItem, syncAnchors, clampToDuration } from "@/lib/timeline/ops";
import { round } from "@/lib/utils";
import type { TextAnimation } from "@/lib/timeline/types";

const Body = z.object({ index: z.number().int().min(0) });

/** „Zastosuj hook”: wstawia ujęcie hooka na początek projektu montażowego i dodaje napis. */
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedAnalysis(user.id, id);
  const { index } = Body.parse(await readJson(req));
  const a = await db.analysis.findUniqueOrThrow({ where: { id }, include: { asset: { include: { scenes: { orderBy: { index: "asc" } } } } } });
  const hooks = (a.hooks as Array<{ text: string; sourceStart: number | null; sourceEnd: number | null; needsNewFootage: boolean | null; duration: number; textAnimation: string; shot: string }> | null) ?? [];
  const hook = hooks[index];
  if (!hook) throw new HttpError(404, "Nie znaleziono propozycji hooka.");
  let ep = await db.editingProject.findFirst({ where: { projectId: a.projectId, variant: "MANUAL" }, orderBy: { createdAt: "desc" } });
  if (!ep) {
    ep = await createEditing(a.projectId, "Montaż z analizy", "MANUAL", docFromScenes({ assetId: a.assetId, durationSec: a.asset.durationSec ?? 0, hasAudio: a.asset.hasAudio, scenes: a.asset.scenes, platform: (a.platform ?? "instagram") as "instagram" }));
  }
  let { doc } = await loadDoc(ep.id);
  let usedFootage = false;
  const len = Math.max(0.6, Math.min(hook.duration, 3));
  if (hook.sourceStart !== null && hook.needsNewFootage !== true) {
    const start = hook.sourceStart;
    const end = Math.min(a.asset.durationSec ?? start + len, hook.sourceEnd !== null && hook.sourceEnd > start ? Math.min(hook.sourceEnd, start + len) : start + len);
    doc = syncAnchors({ ...doc, video: [newVideoItem(a.assetId, start, end, { role: "hook", label: `Hook: ${hook.shot}` }), ...doc.video] });
    // napisy nieprzypięte przesuwamy o długość wstawionego ujęcia
    const shift = end - start;
    doc.texts = doc.texts.map((t) => (t.anchor ? t : { ...t, start: round(t.start + shift, 3), end: round(t.end + shift, 3), words: t.words?.map((w) => ({ ...w, start: w.start + shift, end: w.end + shift })) }));
    usedFootage = true;
  }
  const anim = (["fade", "pop", "slide-up", "typewriter"].includes(hook.textAnimation) ? hook.textAnimation : "pop") as TextAnimation;
  const caption = makeText(hook.text, 0.05, Math.max(1.2, len), { kind: "title", preset: doc.settings.captionPreset, animation: anim, ...(usedFootage ? { anchor: { itemId: doc.video[0].id, offset: 0.05 } } : {}) });
  doc = clampToDuration({ ...doc, texts: [caption, ...doc.texts] });
  await saveDoc(ep.id, doc);
  return json({ editingProjectId: ep.id, usedFootage, needsFootage: hook.needsNewFootage === true || hook.sourceStart === null });
});
