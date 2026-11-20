import "server-only";
import { db } from "../db";
import type { AudioAnalysis } from "../media/audio";

/** Pliki dostępne w edytorze: nagrania projektu, muzyka i logo z biblioteki oraz pliki użyte w dokumencie. */
export async function editorAssets(userId: string, projectId: string, extraIds: string[] = []) {
  const rows = await db.mediaAsset.findMany({
    where: {
      userId,
      OR: [{ projectId, kind: "VIDEO", role: { not: "RENDER" } }, { role: "MUSIC" }, { role: "LOGO" }, { id: { in: extraIds } }],
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((a) => {
    const meta = (a.metadata ?? {}) as { sprite?: { count: number; interval: number; frameWidth: number; frameHeight: number } };
    const aa = a.audioAnalysis as AudioAnalysis | null;
    return {
      id: a.id,
      name: a.originalName,
      kind: a.kind,
      role: a.role,
      status: a.status,
      durationSec: a.durationSec ?? 0,
      width: a.width,
      height: a.height,
      hasAudio: a.hasAudio,
      sprite: meta.sprite ?? null,
      bpm: aa?.tempo?.bpm ?? null,
      beats: a.role === "MUSIC" ? aa?.tempo?.beats ?? [] : [],
      energyRises: aa?.energyRises ?? [],
      tags: a.tags,
      license: a.license,
    };
  });
}
