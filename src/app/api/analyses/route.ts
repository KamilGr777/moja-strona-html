import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { enqueue } from "@/lib/queue";
import { ownedAsset, ownedProject } from "@/lib/services/guard";

const Body = z.object({
  projectId: z.string(),
  assetId: z.string(),
  goal: z.string().nullish(),
  platform: z.enum(["instagram", "tiktok", "youtube"]).optional(),
  service: z.string().nullish(),
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  await rateLimit(`analysis:${user.id}`, env().RATE_LIMIT_AI_PER_HOUR, 3600, "analiz");
  const body = Body.parse(await readJson(req));
  const project = await ownedProject(user.id, body.projectId);
  const asset = await ownedAsset(user.id, body.assetId);
  if (asset.kind !== "VIDEO") throw new HttpError(400, "Analizować można tylko pliki wideo.");
  const analysis = await db.analysis.create({
    data: {
      projectId: project.id,
      assetId: asset.id,
      goal: body.goal ?? project.goal,
      platform: body.platform ?? project.platform,
      service: body.service ?? project.service,
    },
  });
  const job = await enqueue("analyze", { analysisId: analysis.id }, { userId: user.id, projectId: project.id, stage: "W kolejce do analizy" });
  await db.project.update({ where: { id: project.id }, data: { status: "PROCESSING" } });
  return json({ analysis, job }, { status: 201 });
});
