import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { ownedAnalysis } from "@/lib/services/guard";

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedAnalysis(user.id, id);
  const analysis = await db.analysis.findUnique({
    where: { id },
    include: {
      findings: { orderBy: [{ start: "asc" }, { priority: "asc" }] },
      categories: true,
      asset: { include: { scenes: { orderBy: { index: "asc" } } } },
      project: { include: { client: true } },
    },
  });
  const children = await db.analysis.findMany({ where: { parentAnalysisId: id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, totalScore: true, assetId: true, createdAt: true } });
  return json({ analysis, children });
});
