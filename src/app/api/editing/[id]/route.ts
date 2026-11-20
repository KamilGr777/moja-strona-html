import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { ownedEditing } from "@/lib/services/guard";
import { loadDoc, saveDoc } from "@/lib/services/timeline-store";
import { TimelineDocSchema } from "@/lib/timeline/types";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ep = await ownedEditing(user.id, id);
  const { doc, revision } = await loadDoc(id);
  return json({ editing: ep, doc, revision });
});

const Put = z.object({ doc: TimelineDocSchema, revision: z.number().int().optional(), name: z.string().trim().min(1).max(120).optional() });

/** Autosave dokumentu timeline (kontrola wersji: 409 przy edycji w innej karcie). */
export const PUT = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedEditing(user.id, id);
  const body = Put.parse(await readJson(req));
  // wszystkie pliki w dokumencie muszą należeć do użytkownika
  const ids = [...new Set([...body.doc.video.map((v) => v.assetId), ...body.doc.audio.map((a) => a.assetId), ...body.doc.logos.map((l) => l.assetId)])];
  const count = await db.mediaAsset.count({ where: { id: { in: ids }, userId: user.id } });
  if (count !== ids.length) throw new HttpError(403, "Projekt odwołuje się do niedostępnych plików.");
  const res = await saveDoc(id, body.doc, body.revision);
  if (!res.ok) throw new HttpError(409, "Projekt został zmieniony w innym oknie. Odśwież stronę, aby zobaczyć najnowszą wersję.", "conflict");
  if (body.name) await db.editingProject.update({ where: { id }, data: { name: body.name } });
  return json({ revision: res.revision, savedAt: new Date().toISOString() });
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedEditing(user.id, id);
  await db.editingProject.delete({ where: { id } });
  return json({ ok: true });
});
