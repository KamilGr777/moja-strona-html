import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const GET = route(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const role = url.searchParams.get("role") as Prisma.MediaAssetWhereInput["role"] | null;
  const kind = url.searchParams.get("kind") as Prisma.MediaAssetWhereInput["kind"] | null;
  const projectId = url.searchParams.get("projectId");
  const assets = await db.mediaAsset.findMany({
    where: { userId: user.id, ...(role ? { role } : {}), ...(kind ? { kind } : {}), ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, kind: true, role: true, status: true, error: true, originalName: true, sizeBytes: true, durationSec: true, width: true, height: true, fps: true, hasAudio: true, tags: true, license: true, projectId: true, posterKey: true, createdAt: true, audioAnalysis: true, metadata: true, project: { select: { name: true } } },
  });
  return json({
    assets: assets.map((a) => ({ ...a, hasPoster: Boolean(a.posterKey), posterKey: undefined, bpm: (a.audioAnalysis as { tempo?: { bpm?: number } } | null)?.tempo?.bpm ?? null, audioAnalysis: undefined, sceneCount: (a.metadata as { sceneCount?: number })?.sceneCount ?? null, metadata: undefined })),
  });
});
