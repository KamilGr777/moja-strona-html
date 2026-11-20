import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { ownedAnalysis } from "@/lib/services/guard";
import { createEditing, docFromScenes } from "@/lib/services/editing";
import type { Transcript } from "@/lib/ai/transcribe";

/** Otwiera analizowaną rolkę w edytorze (sceny jako osobne klipy, napisy z transkrypcji). */
export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedAnalysis(user.id, id);
  const a = await db.analysis.findUniqueOrThrow({ where: { id }, include: { asset: { include: { scenes: { orderBy: { index: "asc" } } } } } });
  if (a.asset.status !== "READY") throw new HttpError(409, "Plik nie jest jeszcze przetworzony.");
  const existing = await db.editingProject.findFirst({ where: { projectId: a.projectId, variant: "MANUAL" }, orderBy: { createdAt: "desc" } });
  if (existing) return json({ editingProjectId: existing.id });
  const doc = docFromScenes({
    assetId: a.assetId,
    durationSec: a.asset.durationSec ?? 0,
    hasAudio: a.asset.hasAudio,
    scenes: a.asset.scenes,
    platform: (a.platform ?? "instagram") as "instagram",
    transcript: a.transcript as Transcript | null,
  });
  const ep = await createEditing(a.projectId, "Montaż z analizy", "MANUAL", doc);
  return json({ editingProjectId: ep.id }, { status: 201 });
});
