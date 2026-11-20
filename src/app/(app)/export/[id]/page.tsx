import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serialize } from "@/lib/http";
import { loadDoc } from "@/lib/services/timeline-store";
import { totalDuration } from "@/lib/timeline/ops";
import { ExportStudio, type ExportRow } from "@/components/export/export-studio";
import type { FrameCandidate } from "@/components/export/thumbnail-editor";
import { sceneInterest } from "@/lib/analysis/heuristics";

export const metadata = { title: "Export Studio" };

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const ep = await db.editingProject.findFirst({ where: { id, project: { userId: user.id } }, include: { project: { include: { client: true } } } });
  if (!ep) notFound();
  const { doc } = await loadDoc(id);
  const exports = await db.export.findMany({ where: { editingProjectId: id }, orderBy: { createdAt: "desc" }, include: { comments: { orderBy: { createdAt: "desc" } } } });
  const running = await db.renderJob.findFirst({ where: { editingProjectId: id, status: { in: ["QUEUED", "RUNNING"] } }, orderBy: { createdAt: "desc" } });
  const runningJob = running ? await db.job.findFirst({ where: { userId: user.id, type: "render", payload: { path: ["renderJobId"], equals: running.id } } }) : null;
  // kandydaci na okładkę: klatki scen z klipów w projekcie, sortowane wg ostrości/jasności/oceny AI
  const scenes = await db.scene.findMany({ where: { assetId: { in: [...new Set(doc.video.map((v) => v.assetId))] }, frameKey: { not: null } } });
  const frames: FrameCandidate[] = scenes
    .map((s) => ({ url: `/api/media/scene/${s.id}`, label: s.description ?? `Scena ${s.index + 1}`, score: s.interestScore ?? sceneInterest({ motion: (s.motion ?? 0) * 0.3, sharpness: s.sharpness ?? 0.5, contrast: 0.5, saturation: s.saturation ?? 0.5, brightness: s.brightness ?? 0.5 }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 16);
  const rows: ExportRow[] = exports.map((e) => ({
    id: e.id,
    assetId: e.assetId,
    platform: e.platform,
    width: e.width,
    height: e.height,
    fps: e.fps,
    durationSec: e.durationSec,
    sizeBytes: Number(e.sizeBytes),
    burnedSubtitles: e.burnedSubtitles,
    withLogo: e.withLogo,
    srtKey: e.srtKey,
    checklist: e.checklist as ExportRow["checklist"],
    shareActive: Boolean(e.shareTokenHash && e.shareExpiresAt && e.shareExpiresAt > new Date()),
    shareExpiresAt: e.shareExpiresAt?.toISOString() ?? null,
    reviewStatus: e.reviewStatus,
    createdAt: e.createdAt.toISOString(),
    comments: serialize(e.comments).map((c) => ({ ...c, createdAt: String(c.createdAt) })),
  }));
  const client = ep.project.client;
  return (
    <ExportStudio
      editingId={id}
      projectId={ep.projectId}
      name={ep.name}
      durationSec={totalDuration(doc)}
      textsCount={doc.texts.length}
      logosCount={doc.logos.length}
      platform={doc.settings.platform}
      exports={rows}
      activeJobId={runningJob?.id ?? null}
      frames={frames}
      logoUrl={client?.logoAssetId ? `/api/media/${client.logoAssetId}?v=proxy` : null}
      brandColor={client?.brandColors[0] ?? null}
    />
  );
}
