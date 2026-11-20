import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { ownedClient } from "@/lib/services/guard";
import { ClientSchema } from "@/lib/validators";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  return json({ client: await ownedClient(user.id, id) });
});

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedClient(user.id, id);
  const body = ClientSchema.partial().parse(await readJson(req));
  return json({ client: await db.client.update({ where: { id }, data: body }) });
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedClient(user.id, id);
  await db.client.delete({ where: { id } });
  return json({ ok: true });
});
