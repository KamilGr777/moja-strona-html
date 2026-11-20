import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const GET = route(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
  const jobs = await db.job.findMany({
    where: { userId: user.id, ...(projectId ? { projectId } : {}), ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, type: true, status: true, progress: true, stage: true, error: true, projectId: true, createdAt: true, finishedAt: true, attempts: true, payload: true },
  });
  return json({ jobs });
});
