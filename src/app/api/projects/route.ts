import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { ownedClient } from "@/lib/services/guard";
import { GOALS, PLATFORMS, SERVICES } from "@/lib/constants";

export const ProjectBody = z.object({
  name: z.string().trim().min(1, "Podaj nazwę projektu.").max(120),
  type: z.enum(["ANALYSIS", "AUTO_MONTAGE", "EDIT", "IDEA"]),
  clientId: z.string().nullish(),
  goal: z.enum(Object.keys(GOALS) as [string, ...string[]]).nullish(),
  platform: z.enum(Object.keys(PLATFORMS) as [string, ...string[]]).default("instagram"),
  service: z.enum(Object.keys(SERVICES) as [string, ...string[]]).nullish(),
});

export const GET = route(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as Prisma.ProjectWhereInput["type"] | null;
  const q = url.searchParams.get("q");
  const projects = await db.project.findMany({
    where: { userId: user.id, ...(type ? { type } : {}), ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { client: { select: { id: true, name: true } }, analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { totalScore: true, status: true, mode: true } } },
  });
  return json({ projects });
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const body = ProjectBody.parse(await readJson(req));
  if (body.clientId) await ownedClient(user.id, body.clientId);
  const project = await db.project.create({
    data: { userId: user.id, name: body.name, type: body.type, clientId: body.clientId ?? null, goal: body.goal ?? null, platform: body.platform, service: body.service ?? null },
  });
  return json({ project }, { status: 201 });
});
