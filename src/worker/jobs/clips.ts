import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { aiEnabled } from "../../lib/env";
import { storage } from "../../lib/storage";
import { callStructured, describeAiError, imageBlock, textBlock, type AiContent } from "../../lib/ai/client";
import { ClipCatalogSchema } from "../../lib/ai/schemas";
import { CLIP_CATALOG_SYSTEM, clientBlock, contextBlock, type ClientProfile } from "../../lib/ai/prompts";
import { generateMontages, type MontageSettings } from "../../lib/services/montage";
import { clamp, formatTimecode } from "../../lib/utils";
import type { PlatformKey } from "../../lib/constants";
import { ingestAsset } from "./ingest";
import type { JobContext } from "../context";

/** AI Auto Montaż: przetworzenie klipów → katalog scen (AI) → plan montażu → projekty montażowe. */
export async function runClipsJob(projectId: string, ctx: JobContext) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { client: true, clips: { orderBy: { order: "asc" }, include: { asset: true } } },
  });
  await db.project.update({ where: { id: projectId }, data: { status: "PROCESSING" } });
  const warnings: string[] = [];
  try {
    const clips = project.clips;
    if (!clips.length) throw new Error("Projekt nie zawiera klipów.");
    const settings = project.montageSettings as unknown as MontageSettings;

    // 1. Przetworzenie wszystkich klipów (oraz muzyki)
    for (let i = 0; i < clips.length; i++) {
      const from = (i / clips.length) * 50;
      const to = ((i + 1) / clips.length) * 50;
      await ctx.progress(from, `Analiza klipu ${i + 1} z ${clips.length}: ${clips[i].asset.originalName}`);
      try {
        await ingestAsset(clips[i].assetId, ctx.scoped(from, to), ctx.signal);
      } catch (e) {
        if (ctx.signal.aborted) throw e;
        warnings.push(`Klip „${clips[i].asset.originalName}” pominięty: ${(e as Error).message.slice(0, 160)}`);
      }
    }
    if (settings.musicAssetId) {
      await ctx.progress(52, "Analiza muzyki (tempo i beaty)");
      await ingestAsset(settings.musicAssetId, ctx.scoped(52, 55), ctx.signal).catch((e) => {
        if (ctx.signal.aborted) throw e;
        warnings.push("Nie udało się przeanalizować muzyki — montaż bez dopasowania do beatów.");
      });
    }

    // 2. Katalog scen AI (kategorie, oceny, napisy)
    const ready = await db.videoClip.findMany({ where: { projectId }, orderBy: { order: "asc" }, include: { asset: { include: { scenes: { orderBy: { index: "asc" } } } } } });
    const usable = ready.filter((c) => c.asset.status === "READY");
    if (!usable.length) throw new Error("Żaden klip nie nadaje się do montażu.");
    let captionBank: MontageSettings["captionBank"] = null;
    let storyNotes: string | null = null;
    if (aiEnabled()) {
      await ctx.progress(58, "AI: rozpoznawanie ujęć i wybór najlepszych momentów");
      try {
        const content: AiContent = [
          textBlock(`${contextBlock({ goal: project.goal, platform: project.platform as PlatformKey, service: project.service })}\nStyl montażu: ${settings.style}, tempo: ${settings.pace}.\n\n${clientBlock(project.client as ClientProfile | null)}\n\nKlipy i sceny (klatka ze środka każdej sceny):`),
        ];
        const budget = 44;
        const totalScenes = usable.reduce((a, c) => a + c.asset.scenes.length, 0);
        const perClip = Math.max(1, Math.floor(budget / Math.max(1, usable.length)));
        for (const [ci, clip] of usable.entries()) {
          content.push(textBlock(`KLIP ${ci + 1}: „${clip.asset.originalName}”, długość ${clip.asset.durationSec?.toFixed(1)} s, ${clip.asset.scenes.length} scen`));
          let sel = clip.asset.scenes;
          if (totalScenes > budget && sel.length > perClip) {
            const step = sel.length / perClip;
            sel = Array.from({ length: perClip }, (_, k) => sel[Math.floor(k * step)]);
          }
          for (const s of sel) {
            if (!s.frameKey) continue;
            content.push(textBlock(`Klip ${ci + 1}, scena ${s.index} (${formatTimecode(s.start)}–${formatTimecode(s.end)})`));
            content.push(imageBlock(await storage().readBuffer(s.frameKey)));
          }
        }
        const res = await callStructured({ schema: ClipCatalogSchema, system: CLIP_CATALOG_SYSTEM, content, effort: "medium", maxTokens: 32000, signal: ctx.signal });
        await db.usageEvent.create({ data: { userId: project.userId, kind: "ai_analysis", units: res.usage.input + res.usage.output } });
        for (const c of res.data.clips) {
          const clip = usable[c.clipNumber - 1];
          if (!clip) continue;
          for (const s of c.scenes) {
            const row = clip.asset.scenes.find((r) => r.index === s.index);
            if (!row) continue;
            await db.scene.update({
              where: { id: row.id },
              data: {
                description: s.description,
                category: s.category,
                interestScore: clamp(s.interestScore, 0, 10),
                qualityScore: clamp(s.qualityScore, 0, 10),
                hookPotential: clamp(s.hookPotential, 0, 10),
                aiData: { ...((row.aiData as object) ?? {}), issues: s.issues } as Prisma.InputJsonValue,
              },
            });
          }
          const cats = c.scenes.map((s) => s.category);
          const top = cats.sort((a, b) => cats.filter((x) => x === b).length - cats.filter((x) => x === a).length)[0] ?? null;
          await db.videoClip.update({
            where: { id: clip.id },
            data: { summary: c.summary, category: top, categorySource: "ai", score: Math.max(...c.scenes.map((s) => clamp(s.interestScore, 0, 10)), 0) * 10, scoreSource: "ai" },
          });
        }
        captionBank = res.data.captions;
        storyNotes = res.data.storyNotes;
      } catch (e) {
        if (ctx.signal.aborted) throw e;
        warnings.push(`AI nie rozpoznało ujęć (${describeAiError(e)}) — montaż oparty na pomiarach technicznych i Twoich tagach.`);
      }
    } else {
      warnings.push("Tryb bez AI: ujęcia wybierane na podstawie pomiarów technicznych (ostrość, ruch, jasność) i tagów nadanych klipom. Napisy z szablonów.");
    }
    await db.project.update({
      where: { id: projectId },
      data: { montageSettings: { ...settings, captionBank, storyNotes, warnings } as unknown as Prisma.InputJsonValue },
    });

    // 3. Plan montażu (+ warianty)
    await ctx.progress(85, "Budowanie historii i układu timeline");
    const created = await generateMontages(projectId);
    await ctx.progress(100, "Gotowe");
    return { editingProjectIds: created, warnings };
  } catch (err) {
    await db.project.update({ where: { id: projectId }, data: { status: ctx.signal.aborted ? "DRAFT" : "FAILED" } });
    throw err;
  }
}
