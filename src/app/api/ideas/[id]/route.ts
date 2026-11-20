import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { saved } = z.object({ saved: z.boolean() }).parse(await readJson(req));
  const r = await db.contentIdea.updateMany({ where: { id, userId: user.id }, data: { saved } });
  if (!r.count) throw new HttpError(404, "Nie znaleziono pomysłu.");
  return json({ ok: true });
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await db.contentIdea.deleteMany({ where: { id, userId: user.id } });
  return json({ ok: true });
});
