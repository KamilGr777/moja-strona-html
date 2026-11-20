import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { ownedProject } from "@/lib/services/guard";
import { createEditing } from "@/lib/services/editing";
import { emptyDoc } from "@/lib/timeline/types";
import { newVideoItem } from "@/lib/timeline/ops";

const Body = z.object({
  projectId: z.string().optional(),
  name: z.string().trim().min(1).max(120).default("Nowy montaż"),
  assetIds: z.array(z.string()).max(100).default([]),
  platform: z.enum(["instagram", "tiktok", "youtube"]).default("instagram"),
});

export const GET = route(async () => {
  const user = await requireApiUser();
  const items = await db.editingProject.findMany({
    where: { project: { userId: user.id } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { project: { select: { id: true, name: true, client: { select: { name: true } }, thumbnailAssetId: true } }, exports: { take: 1, orderBy: { createdAt: "desc" } } },
  });
  return json({ items });
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const body = Body.parse(await readJson(req));
  const project = body.projectId
    ? await ownedProject(user.id, body.projectId)
    : await db.project.create({ data: { userId: user.id, name: body.name, type: "EDIT", platform: body.platform } });
  const assets = await db.mediaAsset.findMany({ where: { id: { in: body.assetIds }, userId: user.id, kind: "VIDEO" } });
  if (assets.some((a) => a.status !== "READY")) throw new HttpError(409, "Niektóre nagrania są jeszcze przetwarzane.");
  const doc = emptyDoc({ platform: body.platform });
  doc.video = body.assetIds
    .map((id) => assets.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => newVideoItem(a!.id, 0, Math.min(a!.durationSec ?? 3, 6)));
  const ep = await createEditing(project.id, body.name, "MANUAL", doc);
  await db.project.update({ where: { id: project.id }, data: { status: "EDITING" } });
  return json({ editingProjectId: ep.id }, { status: 201 });
});
