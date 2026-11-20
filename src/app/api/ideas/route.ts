import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const GET = route(async (req) => {
  const user = await requireApiUser();
  const saved = new URL(req.url).searchParams.get("saved") === "1";
  const ideas = await db.contentIdea.findMany({ where: { userId: user.id, ...(saved ? { saved: true } : {}) }, orderBy: { createdAt: "desc" }, take: 60, include: { client: { select: { name: true } } } });
  return json({ ideas });
});
