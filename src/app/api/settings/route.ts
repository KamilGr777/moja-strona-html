import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";

const Patch = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  retentionDays: z.number().int().min(0).max(3650).optional(),
  settings: z.object({ defaultPlatform: z.enum(["instagram", "tiktok", "youtube"]).optional() }).optional(),
});

export const PATCH = route(async (req) => {
  const user = await requireApiUser();
  const body = Patch.parse(await readJson(req));
  const u = await db.user.update({ where: { id: user.id }, data: { ...body, settings: body.settings as Prisma.InputJsonValue | undefined }, select: { name: true, retentionDays: true, settings: true } });
  return json({ user: u });
});
