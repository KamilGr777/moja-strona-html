import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadDoc } from "@/lib/services/timeline-store";
import { editorAssets } from "@/lib/services/editor-data";
import { VARIANT_PRESETS } from "@/lib/montage/planner";
import { MontageWorkspace, type ClipRow, type VariantView } from "@/components/montage/montage-workspace";
import type { EditorAsset } from "@/components/editor/state";
import type { AudioAnalysis } from "@/lib/media/audio";

export const metadata = { title: "AI Auto Montaż" };

export default async function MontageProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      clips: { orderBy: { order: "asc" }, include: { asset: true } },
      editingProjects: { where: { variant: { in: ["AUTO", "VIRAL", "PREMIUM", "SALES"] } }, orderBy: { createdAt: "asc" }, include: { exports: { take: 1, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!project) notFound();
  const job = await db.job.findFirst({ where: { projectId: id, type: "clips", status: { in: ["QUEUED", "RUNNING"] } }, orderBy: { createdAt: "desc" } });
  const music = await db.mediaAsset.findMany({ where: { userId: user.id, role: "MUSIC" }, orderBy: { createdAt: "desc" } });
  const variants: VariantView[] = [];
  const docAssetIds: string[] = [];
  for (const ep of project.editingProjects) {
    const { doc } = await loadDoc(ep.id);
    docAssetIds.push(...doc.video.map((v) => v.assetId), ...doc.audio.map((a) => a.assetId), ...doc.logos.map((l) => l.assetId));
    const cl = ep.changelog as { changes?: string[]; stats?: VariantView["stats"] } | null;
    const preset = VARIANT_PRESETS[ep.variant as keyof typeof VARIANT_PRESETS];
    variants.push({ id: ep.id, name: ep.name, variant: ep.variant, doc, changes: cl?.changes ?? [], stats: cl?.stats ?? null, exportId: ep.exports[0]?.id ?? null, summary: preset?.summary, useCase: preset?.useCase });
  }
  const assets = Object.fromEntries(((await editorAssets(user.id, id, docAssetIds)) as EditorAsset[]).map((a) => [a.id, a]));
  const settings = project.montageSettings as (Record<string, unknown> & { warnings?: string[] }) | null;
  const clips: ClipRow[] = project.clips.map((c) => ({
    id: c.id,
    assetId: c.assetId,
    name: c.asset.originalName,
    status: c.asset.status,
    error: c.asset.error,
    durationSec: c.asset.durationSec,
    tags: c.asset.tags,
    category: c.category,
    categorySource: c.categorySource,
    summary: c.summary,
    scenes: (c.asset.metadata as { sceneCount?: number })?.sceneCount ?? 0,
  }));
  return (
    <MontageWorkspace
      projectId={id}
      name={project.name}
      clips={clips}
      music={music.map((m) => ({ id: m.id, name: m.originalName, status: m.status, bpm: (m.audioAnalysis as AudioAnalysis | null)?.tempo?.bpm ?? null, license: m.license }))}
      settings={settings ? { style: String(settings.style), duration: String(settings.duration), customDuration: (settings.customDuration as number | null) ?? null, pace: String(settings.pace), goal: String(settings.goal), withCaptions: Boolean(settings.withCaptions), variants: Boolean(settings.variants), musicAssetId: (settings.musicAssetId as string | null) ?? null } : null}
      warnings={settings?.warnings ?? []}
      variants={variants}
      assets={assets}
      activeJobId={job?.id ?? null}
      checklist={project.shotChecklist as Array<{ name: string; done: boolean; detail?: string }> | null}
    />
  );
}
