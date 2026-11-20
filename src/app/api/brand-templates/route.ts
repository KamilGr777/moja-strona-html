import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { ownedClient } from "@/lib/services/guard";
import { BrandTemplateSchema } from "@/lib/validators";

export const GET = route(async () => {
  const user = await requireApiUser();
  const templates = await db.brandTemplate.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { client: { select: { name: true } } } });
  return json({ templates });
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const body = BrandTemplateSchema.parse(await readJson(req));
  if (body.clientId) await ownedClient(user.id, body.clientId);
  const t = await db.brandTemplate.create({
    data: { ...body, captionStyle: (body.captionStyle ?? undefined) as Prisma.InputJsonValue | undefined, userId: user.id },
  });
  return json({ template: t }, { status: 201 });
});
