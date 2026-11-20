import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { ownedClient, ownedProject } from "@/lib/services/guard";
import { deleteProjectCompletely } from "@/lib/services/assets";

const Patch = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  clientId: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
  platform: z.enum(["instagram", "tiktok", "youtube"]).optional(),
  service: z.string().nullable().optional(),
  shotChecklist: z.array(z.object({ name: z.string(), done: z.boolean(), detail: z.string().optional() })).optional(),
});

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedProject(user.id, id);
  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: true,
      assets: { orderBy: { createdAt: "asc" } },
      clips: { orderBy: { order: "asc" } },
      analyses: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, totalScore: true, mode: true, createdAt: true, parentAnalysisId: true, assetId: true } },
      editingProjects: { orderBy: { createdAt: "asc" }, include: { exports: { orderBy: { createdAt: "desc" }, include: { comments: { orderBy: { createdAt: "desc" } } } } } },
      jobs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  return json({ project });
});

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await ownedProject(user.id, id);
  const body = Patch.parse(await readJson(req));
  if (body.clientId) await ownedClient(user.id, body.clientId);
  const project = await db.project.update({
    where: { id },
    data: { ...body, shotChecklist: body.shotChecklist as Prisma.InputJsonValue | undefined },
  });
  return json({ project });
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await deleteProjectCompletely(id, user.id);
  return json({ ok: true });
});
