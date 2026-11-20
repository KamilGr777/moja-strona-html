import { z } from "zod";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ownedEditing } from "@/lib/services/guard";
import { loadDoc } from "@/lib/services/timeline-store";
import { createRender } from "@/lib/services/editing";

const Body = z.object({
  quality: z.enum(["draft", "standard", "high"]).default("standard"),
  burnSubtitles: z.boolean().default(true),
  withLogo: z.boolean().default(true),
  loudnorm: z.boolean().default(true),
  preview: z.boolean().default(false),
  fps: z.number().min(12).max(60).nullish(),
  platform: z.enum(["instagram", "tiktok", "youtube"]).optional(),
});

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  await rateLimit(`render:${user.id}`, env().RATE_LIMIT_RENDERS_PER_HOUR, 3600, "renderów");
  const { id } = await ctx.params;
  const ep = await ownedEditing(user.id, id);
  const body = Body.parse(await readJson(req));
  const { doc } = await loadDoc(id);
  if (!doc.video.length) throw new HttpError(400, "Timeline jest pusta — dodaj klipy przed renderem.");
  if (body.platform) doc.settings.platform = body.platform;
  const r = await createRender(id, user.id, ep.projectId, doc, { ...body, fps: body.fps ?? null });
  return json({ renderJobId: r.renderJob.id, jobId: r.job.id }, { status: 201 });
});
