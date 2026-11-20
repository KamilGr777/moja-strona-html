import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { storage } from "../storage";
import { SHOT_CATEGORIES, DURATION_PRESETS, type MontageStyle, type PaceKey, type ServiceKey, type PlatformKey, type ShotCategory, type DurationPreset } from "../constants";
import { sceneInterest } from "../analysis/heuristics";
import { statsForRange, type FrameSample } from "../media/video-analysis";
import type { AudioAnalysis } from "../media/audio";
import { planMontage, VARIANT_PRESETS, type CandidateScene, type CaptionBank, type PlanResult } from "../montage/planner";
import type { AssetMap } from "../timeline/types";
import { saveDoc } from "./timeline-store";
import { round } from "../utils";

export interface MontageSettings {
  style: MontageStyle;
  duration: DurationPreset;
  customDuration?: number | null;
  pace: PaceKey;
  goal: string;
  withCaptions: boolean;
  variants: boolean;
  musicAssetId?: string | null;
  captionBank?: CaptionBank | null;
  storyNotes?: string | null;
}

async function loadSamplesByKey(meta: unknown): Promise<FrameSample[]> {
  const key = (meta as { statsKey?: string })?.statsKey;
  if (!key) return [];
  try {
    return JSON.parse((await storage().readBuffer(key)).toString("utf8"));
  } catch {
    return [];
  }
}

export async function assetMapForUser(userId: string, ids: string[]): Promise<AssetMap> {
  const rows = await db.mediaAsset.findMany({ where: { userId, id: { in: ids } } });
  return Object.fromEntries(
    rows.map((a) => [a.id, { id: a.id, durationSec: a.durationSec ?? 0, hasAudio: a.hasAudio, width: a.width, height: a.height, name: a.originalName, kind: a.kind }]),
  );
}

/** Zbiera kandydatów (sceny z ocenami AI lub heurystycznymi) i plan dla projektu auto montażu. */
export async function buildPlannerContext(projectId: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { client: true, clips: { orderBy: { order: "asc" }, include: { asset: { include: { scenes: { orderBy: { index: "asc" } } } } } } },
  });
  const settings = project.montageSettings as unknown as MontageSettings;
  const scenes: CandidateScene[] = [];
  const samples: Record<string, FrameSample[]> = {};
  for (const clip of project.clips) {
    const a = clip.asset;
    if (a.status !== "READY") continue;
    samples[a.id] = await loadSamplesByKey(a.metadata);
    const userCat = (a.tags.find((t) => t in SHOT_CATEGORIES) as ShotCategory | undefined) ?? null;
    for (const s of a.scenes) {
      const stats = statsForRange(samples[a.id], s.start, s.end);
      const hi = sceneInterest(stats);
      scenes.push({
        assetId: a.id,
        assetName: a.originalName,
        sceneIndex: s.index,
        start: s.start,
        end: s.end,
        category: (s.category as ShotCategory | null) ?? userCat,
        interest: s.interestScore ?? hi,
        quality: s.qualityScore ?? round(stats.sharpness * 7 + (stats.brightness > 0.15 ? 3 : 0), 2),
        hookPotential: s.hookPotential ?? round(hi * 0.8 + (userCat === "result" ? 2 : 0), 2),
        motion: stats.motion,
        sharpness: stats.sharpness,
        brightness: stats.brightness,
        description: s.description,
        clipOrder: clip.order,
      });
    }
  }
  const ids = [...new Set([...scenes.map((s) => s.assetId), ...(settings.musicAssetId ? [settings.musicAssetId] : []), ...(project.client?.logoAssetId ? [project.client.logoAssetId] : [])])];
  const assets = await assetMapForUser(project.userId, ids);
  let music: Parameters<typeof planMontage>[0]["music"] = null;
  if (settings.musicAssetId) {
    const m = await db.mediaAsset.findFirst({ where: { id: settings.musicAssetId, userId: project.userId, status: "READY" } });
    const aa = m?.audioAnalysis as AudioAnalysis | null;
    if (m) music = { assetId: m.id, durationSec: m.durationSec ?? 0, beats: aa?.tempo.beats ?? [], energyRises: aa?.energyRises ?? [], bpm: aa?.tempo.bpm ?? null };
  }
  const logo = project.client?.logoAssetId ? await db.mediaAsset.findFirst({ where: { id: project.client.logoAssetId, status: "READY" } }) : null;
  return { project, settings, scenes, samples, assets, music, logoAssetId: logo?.id ?? null };
}

export function targetSeconds(s: MontageSettings) {
  return s.duration === "custom" ? Math.max(5, Math.min(120, s.customDuration ?? 20)) : DURATION_PRESETS[s.duration].target;
}

/** Generuje montaż główny (+ opcjonalnie warianty A/B/C) i zapisuje je jako projekty montażowe. */
export async function generateMontages(projectId: string, opts: { only?: "MAIN" | "VARIANTS" } = {}) {
  const c = await buildPlannerContext(projectId);
  if (!c.scenes.length) throw new Error("Żaden klip nie został jeszcze przetworzony.");
  const base = {
    scenes: c.scenes,
    samples: c.samples,
    assets: c.assets,
    targetDuration: targetSeconds(c.settings),
    service: (c.project.service ?? "other") as ServiceKey,
    platform: (c.project.platform ?? "instagram") as PlatformKey,
    withCaptions: c.settings.withCaptions,
    captions: c.settings.captionBank ?? null,
    client: c.project.client ? { defaultCta: c.project.client.defaultCta, logoAssetId: c.logoAssetId, brandColors: c.project.client.brandColors } : null,
    music: c.music,
  };
  const results: Array<{ variant: string; name: string; plan: PlanResult }> = [];
  if (opts.only !== "VARIANTS") {
    results.push({ variant: "AUTO", name: "AI Auto Montaż", plan: planMontage({ ...base, style: c.settings.style, pace: c.settings.pace }) });
  }
  if (c.settings.variants || opts.only === "VARIANTS") {
    for (const [key, v] of Object.entries(VARIANT_PRESETS)) {
      results.push({ variant: key, name: v.label, plan: planMontage({ ...base, style: v.style, pace: v.pace }) });
    }
  }
  const created: string[] = [];
  for (const r of results) {
    await db.editingProject.deleteMany({ where: { projectId, variant: r.variant } });
    const ep = await db.editingProject.create({
      data: {
        projectId,
        name: r.name,
        variant: r.variant,
        settings: r.plan.doc.settings as Prisma.InputJsonValue,
        changelog: { changes: r.plan.changelog, stats: r.plan.stats, notes: c.settings.storyNotes ?? null } as Prisma.InputJsonValue,
      },
    });
    await saveDoc(ep.id, r.plan.doc);
    created.push(ep.id);
  }
  await db.project.update({ where: { id: projectId }, data: { status: "EDITING" } });
  return created;
}
