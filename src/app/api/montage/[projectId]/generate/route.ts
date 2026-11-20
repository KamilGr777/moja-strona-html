import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { enqueue } from "@/lib/queue";
import { ownedAsset, ownedProject } from "@/lib/services/guard";
import { DURATION_PRESETS, MONTAGE_GOALS, MONTAGE_STYLES, PACES } from "@/lib/constants";

const Body = z.object({
  style: z.enum(Object.keys(MONTAGE_STYLES) as [string, ...string[]]),
  duration: z.enum(Object.keys(DURATION_PRESETS) as [string, ...string[]]),
  customDuration: z.number().min(5).max(120).nullish(),
  pace: z.enum(Object.keys(PACES) as [string, ...string[]]),
  goal: z.enum(Object.keys(MONTAGE_GOALS) as [string, ...string[]]),
  withCaptions: z.boolean().default(true),
  variants: z.boolean().default(true),
  musicAssetId: z.string().nullish(),
});

export const POST = route(async (req, ctx: { params: Promise<{ projectId: string }> }) => {
  const user = await requireApiUser();
  await rateLimit(`analysis:${user.id}`, env().RATE_LIMIT_AI_PER_HOUR, 3600, "analiz");
  const { projectId } = await ctx.params;
  const project = await ownedProject(user.id, projectId);
  const body = Body.parse(await readJson(req));
  if (body.musicAssetId) await ownedAsset(user.id, body.musicAssetId);
  const clips = await db.videoClip.count({ where: { projectId } });
  if (clips < 1) throw new HttpError(400, "Dodaj co najmniej jeden klip.");
  await db.project.update({ where: { id: project.id }, data: { montageSettings: body as Prisma.InputJsonValue, status: "PROCESSING" } });
  const job = await enqueue("clips", { projectId }, { userId: user.id, projectId, stage: "W kolejce do auto montażu" });
  return json({ job }, { status: 201 });
});
