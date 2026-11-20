import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { ownedAsset } from "@/lib/services/guard";
import { deleteAsset } from "@/lib/services/assets";

const Patch = z.object({
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  license: z.string().trim().max(300).nullable().optional(),
  originalName: z.string().trim().min(1).max(200).optional(),
});

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedAsset(user.id, id);
  const body = Patch.parse(await readJson(req));
  const a = await db.mediaAsset.update({ where: { id }, data: body, select: { id: true, tags: true, license: true, originalName: true } });
  return json({ asset: a });
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await deleteAsset(id, user.id);
  return json({ ok: true });
});
