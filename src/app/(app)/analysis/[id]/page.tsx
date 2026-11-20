import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serialize } from "@/lib/http";
import { AnalysisReport, type AnalysisView } from "@/components/analysis/report";
import { AnalysisPending } from "@/components/analysis/analysis-pending";
import { BeforeAfter, type FixedVersion } from "@/components/analysis/before-after";

export const metadata = { title: "Raport analizy" };

export default async function AnalysisReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const a = await db.analysis.findFirst({
    where: { id, project: { userId: user.id } },
    include: {
      findings: { orderBy: [{ start: "asc" }, { priority: "asc" }] },
      categories: true,
      asset: { include: { scenes: { orderBy: { index: "asc" } } } },
      project: { include: { client: true } },
    },
  });
  if (!a) notFound();
  if (a.status !== "COMPLETED") {
    const job = await db.job.findFirst({ where: { userId: user.id, type: "analyze", payload: { path: ["analysisId"], equals: a.id } }, orderBy: { createdAt: "desc" } });
    return <AnalysisPending jobId={job?.id ?? null} name={a.project.name} error={a.status === "FAILED" ? a.error : a.status === "CANCELLED" ? "Analiza została anulowana." : null} />;
  }
  const order = ["hook", "visual", "clarity", "pacing", "cta", "captions"];
  a.categories.sort((x, y) => order.indexOf(x.key) - order.indexOf(y.key));

  // Najnowsza poprawiona wersja (Przed / Po)
  const fixed = await db.editingProject.findFirst({
    where: { projectId: a.projectId, variant: "FIXED", changelog: { path: ["analysisId"], equals: a.id } },
    orderBy: { createdAt: "desc" },
    include: { renderJobs: { orderBy: { createdAt: "desc" }, take: 1, include: { export: { select: { id: true } } } } },
  });
  let version: FixedVersion | null = null;
  if (fixed) {
    const rj = fixed.renderJobs[0];
    const rjob = rj ? await db.job.findFirst({ where: { userId: user.id, type: "render", payload: { path: ["renderJobId"], equals: rj.id } }, orderBy: { createdAt: "desc" } }) : null;
    const child = rj?.outputAssetId ? await db.analysis.findFirst({ where: { parentAnalysisId: a.id, assetId: rj.outputAssetId }, orderBy: { createdAt: "desc" } }) : null;
    const cjob = child ? await db.job.findFirst({ where: { userId: user.id, type: "analyze", payload: { path: ["analysisId"], equals: child.id } }, orderBy: { createdAt: "desc" } }) : null;
    const cl = fixed.changelog as { changes?: string[]; comparison?: FixedVersion["comparison"] } | null;
    version = {
      editingProjectId: fixed.id,
      name: fixed.name,
      changes: cl?.changes ?? [],
      comparison: cl?.comparison ?? null,
      render: rj ? { id: rj.id, status: rj.status, jobId: rjob?.id ?? null, outputAssetId: rj.outputAssetId, exportId: rj.export?.id ?? null, error: rj.error } : null,
      reanalysis: child ? { id: child.id, status: child.status, totalScore: child.totalScore, mode: child.mode, jobId: cjob?.id ?? null } : null,
    };
  }
  const view = serialize(a) as unknown as AnalysisView;
  return (
    <AnalysisReport
      a={view}
      beforeAfter={version ? <BeforeAfter originalAssetId={a.assetId} originalScore={a.totalScore ?? 0} originalScaled={a.mode === "HEURISTIC"} v={version} /> : null}
    />
  );
}
