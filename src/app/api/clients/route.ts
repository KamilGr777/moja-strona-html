import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { ClientSchema } from "@/lib/validators";

export const GET = route(async () => {
  const user = await requireApiUser();
  const clients = await db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, include: { _count: { select: { projects: true } } } });
  return json({ clients });
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const body = ClientSchema.parse(await readJson(req));
  const client = await db.client.create({ data: { ...body, userId: user.id } });
  return json({ client }, { status: 201 });
});
