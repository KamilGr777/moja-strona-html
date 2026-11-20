import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireApiUser, randomToken, sha256 } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";

async function owned(userId: string, id: string) {
  const ex = await db.export.findFirst({ where: { id, editingProject: { project: { userId } } }, include: { editingProject: true } });
  if (!ex) throw new HttpError(404, "Nie znaleziono eksportu.");
  return ex;
}

/** Prywatny link do akceptacji przez klienta. Token jest zwracany tylko raz — w bazie przechowywany jest wyłącznie jego hash. */
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const ex = await owned(user.id, id);
  const { days } = z.object({ days: z.number().int().min(1).max(60).default(14) }).parse(await readJson(req));
  const token = randomToken(24);
  await db.export.update({ where: { id }, data: { shareTokenHash: sha256(token), shareExpiresAt: new Date(Date.now() + days * 86400_000), reviewStatus: "pending" } });
  await db.project.update({ where: { id: ex.editingProject.projectId }, data: { status: "IN_REVIEW" } });
  return json({ url: `${env().APP_URL.replace(/\/$/, "")}/review/${token}`, expiresAt: new Date(Date.now() + days * 86400_000) });
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await owned(user.id, id);
  await db.export.update({ where: { id }, data: { shareTokenHash: null, shareExpiresAt: null } });
  return json({ ok: true });
});
