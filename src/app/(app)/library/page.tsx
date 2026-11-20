import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/layout/app-shell";
import { LibraryApp, type LibAsset } from "@/components/library/library-app";
import type { AudioAnalysis } from "@/lib/media/audio";

export const metadata = { title: "Biblioteka nagrań" };

export default async function LibraryPage() {
  const user = await requireUser();
  const rows = await db.mediaAsset.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 500, include: { project: { select: { name: true } } } });
  const assets: LibAsset[] = rows.map((a) => ({
    id: a.id, kind: a.kind, role: a.role, status: a.status, error: a.error, originalName: a.originalName, sizeBytes: Number(a.sizeBytes), durationSec: a.durationSec, width: a.width, height: a.height, tags: a.tags, license: a.license, projectId: a.projectId, project: a.project, hasPoster: Boolean(a.posterKey), createdAt: a.createdAt.toISOString(), bpm: (a.audioAnalysis as AudioAnalysis | null)?.tempo?.bpm ?? null,
  }));
  const total = rows.reduce((s, a) => s + Number(a.sizeBytes), 0);
  return (
    <div>
      <PageHeader eyebrow="Media" title="Biblioteka nagrań" description={`Wszystkie Twoje pliki: oryginały, muzyka, logo i rendery. Zajętość: ${(total / 1024 / 1024).toFixed(0)} MB.`} />
      <LibraryApp assets={assets} musicLibrary={Boolean(env().MUSIC_LIBRARY_DIR)} />
    </div>
  );
}
