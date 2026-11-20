import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadDoc } from "@/lib/services/timeline-store";
import { editorAssets } from "@/lib/services/editor-data";
import { EditorApp } from "@/components/editor/editor-app";
import type { EditorContext } from "@/components/editor/left-panel";
import type { EditorAsset } from "@/components/editor/state";

export const metadata = { title: "Edytor wideo" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const ep = await db.editingProject.findFirst({ where: { id, project: { userId: user.id } }, include: { project: { include: { client: true } } } });
  if (!ep) notFound();
  const { doc, revision } = await loadDoc(id);
  const client = ep.project.client;
  const ids = [...doc.video.map((v) => v.assetId), ...doc.audio.map((a) => a.assetId), ...doc.logos.map((l) => l.assetId), ...(client?.logoAssetId ? [client.logoAssetId] : [])];
  const assets = (await editorAssets(user.id, ep.projectId, ids)) as EditorAsset[];
  const analysis = await db.analysis.findFirst({
    where: { projectId: ep.projectId, status: "COMPLETED", parentAnalysisId: null },
    orderBy: { createdAt: "desc" },
    include: { findings: { orderBy: { start: "asc" } } },
  });
  const templates = await db.brandTemplate.findMany({ where: { userId: user.id, OR: [{ clientId: null }, { clientId: client?.id ?? "__none__" }] }, orderBy: { updatedAt: "desc" } });
  const ctx: EditorContext = {
    editingId: ep.id,
    projectId: ep.projectId,
    clientId: client?.id ?? null,
    clientCta: client?.defaultCta ?? null,
    clientLogoId: client?.logoAssetId ?? null,
    clientColors: client?.brandColors ?? [],
    analysis: analysis
      ? {
          id: analysis.id,
          assetId: analysis.assetId,
          captionIdeas: (analysis.captionIdeas as { items?: Array<{ text: string; start: number; end: number; kind: string }> } | null)?.items ?? [],
          transcript: (analysis.transcript as NonNullable<EditorContext["analysis"]>["transcript"]) ?? null,
          music: analysis.musicAdvice ? { mood: (analysis.musicAdvice as { mood: string }).mood, tempo: (analysis.musicAdvice as { tempo: string }).tempo, recommendation: (analysis.musicAdvice as { recommendation: string }).recommendation } : null,
          findings: analysis.findings.map((f) => ({ id: f.id, start: f.start, end: f.end, severity: f.severity, suggestion: f.suggestion, problem: f.problem })),
        }
      : null,
    templates: templates.map((t) => ({ id: t.id, name: t.name, captionPreset: t.captionPreset, colors: t.colors, cta: t.cta, endCardText: t.endCardText, logoAssetId: t.logoAssetId })),
  };
  return <EditorApp key={`${ep.id}-${revision}`} name={ep.name} initialDoc={doc} initialRevision={revision} initialAssets={assets} ctx={ctx} />;
}
