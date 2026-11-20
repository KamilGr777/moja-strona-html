import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const r = await db.brandTemplate.deleteMany({ where: { id, userId: user.id } });
  if (!r.count) throw new HttpError(404, "Nie znaleziono szablonu.");
  return json({ ok: true });
});
