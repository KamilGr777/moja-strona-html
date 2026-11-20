import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ownedAnalysis } from "@/lib/services/guard";
import { createEditing, createRender } from "@/lib/services/editing";
import { fixReel } from "@/lib/montage/fix-reel";
import { statsForRange, type FrameSample } from "@/lib/media/video-analysis";
import { sceneInterest } from "@/lib/analysis/heuristics";
import { storage } from "@/lib/storage";
import type { ServiceKey, PlatformKey } from "@/lib/constants";
import type { CaptionPresetKey } from "@/lib/timeline/types";

const Body = z.object({
  targetDuration: z.number().min(5).max(120).nullish(),
  addCaptions: z.boolean().default(true),
  mode: z.enum(["full", "weak-only"]).default("full"),
  preset: z.enum(["minimal_premium", "bold_viral", "cinematic", "luxury", "clean_modern"]).default("clean_modern"),
});

/** „Popraw rolkę z AI”: nowa wersja montażu z tego samego materiału + render + ponowna ocena. */
export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  await rateLimit(`render:${user.id}`, env().RATE_LIMIT_RENDERS_PER_HOUR, 3600, "renderów");
  const { id } = await ctx.params;
  await ownedAnalysis(user.id, id);
  const body = Body.parse(await readJson(req));
  const a = await db.analysis.findUniqueOrThrow({
    where: { id },
    include: { findings: true, asset: { include: { scenes: { orderBy: { index: "asc" } } } }, project: { include: { client: true } } },
  });
  if (a.status !== "COMPLETED") throw new HttpError(409, "Analiza nie jest jeszcze zakończona.");
  const asset = a.asset;
  const statsKey = (asset.metadata as { statsKey?: string })?.statsKey;
  const samples: FrameSample[] = statsKey ? JSON.parse((await storage().readBuffer(statsKey)).toString("utf8")) : [];
  const transcript = a.transcript as { segments?: Array<{ words: unknown[] }> } | null;
  const speechWords = transcript?.segments?.reduce((n, s) => n + (s.words?.length ?? 0), 0) ?? 0;
  const captionIdeas = (a.captionIdeas as { items?: Array<{ text: string; start: number; end: number; kind: string }> } | null)?.items ?? null;
  const hooks = (a.hooks as Array<{ text: string; needsNewFootage: boolean | null }> | null) ?? [];
  const retention = (a.retention as { segments?: Array<{ start: number; end: number; level: string }> } | null)?.segments ?? [];
  const logo = a.project.client?.logoAssetId ? await db.mediaAsset.findFirst({ where: { id: a.project.client.logoAssetId, status: "READY" } }) : null;

  const result = fixReel({
    assetId: asset.id,
    durationSec: asset.durationSec ?? 0,
    hasAudio: asset.hasAudio,
    speechWords,
    scenes: asset.scenes.map((s) => {
      const st = statsForRange(samples, s.start, s.end);
      const hi = sceneInterest(st);
      return { index: s.index, start: s.start, end: s.end, interest: s.interestScore ?? hi, hookPotential: s.hookPotential ?? hi, quality: s.qualityScore ?? st.sharpness * 10, sharpness: st.sharpness, brightness: st.brightness, motion: st.motion, category: s.category, description: s.description };
    }),
    findings: a.findings.map((f) => ({ start: f.start, end: f.end, severity: f.severity, category: f.category, suggestedCaption: f.suggestedCaption })),
    samples,
    assets: { [asset.id]: { id: asset.id, durationSec: asset.durationSec ?? 0, hasAudio: asset.hasAudio, width: asset.width, height: asset.height }, ...(logo ? { [logo.id]: { id: logo.id, durationSec: 0, hasAudio: false, width: logo.width, height: logo.height, kind: "IMAGE" as const } } : {}) },
    targetDuration: Math.min(body.targetDuration ?? a.optimalLengthSec ?? asset.durationSec ?? 20, asset.durationSec ?? 999),
    addCaptions: body.addCaptions,
    mode: body.mode,
    service: (a.service ?? "other") as ServiceKey,
    platform: (a.platform ?? "instagram") as PlatformKey,
    preset: body.preset as CaptionPresetKey,
    aiCaptions: captionIdeas,
    hookText: hooks.find((h) => h.needsNewFootage === false)?.text ?? null,
    client: { defaultCta: a.project.client?.defaultCta ?? null, logoAssetId: logo?.id ?? null },
    weakSegments: retention.filter((s) => s.level === "weak" || s.level === "drop"),
  });
  const ep = await createEditing(a.projectId, body.mode === "full" ? "Wersja poprawiona przez AI" : "Poprawione słabe momenty", "FIXED", result.doc, {
    changes: result.changes,
    comparison: result.comparison,
    analysisId: a.id,
  });
  const { renderJob, job } = await createRender(ep.id, user.id, a.projectId, result.doc, {
    quality: "standard",
    burnSubtitles: true,
    withLogo: true,
    loudnorm: true,
    preview: false,
    reanalyzeParentId: a.id,
  });
  await db.project.update({ where: { id: a.projectId }, data: { status: "EDITING" } });
  return json({ editingProjectId: ep.id, renderJobId: renderJob.id, jobId: job.id, changes: result.changes, comparison: result.comparison }, { status: 201 });
});
