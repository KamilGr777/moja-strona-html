import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { env, aiEnabled, transcriptionEnabled } from "../../lib/env";
import { storage, assetKey } from "../../lib/storage";
import { extractFrame, extractSpeechAudio } from "../../lib/media/derivatives";
import { statsForRange } from "../../lib/media/video-analysis";
import type { AudioAnalysis } from "../../lib/media/audio";
import { transcribe, type Transcript } from "../../lib/ai/transcribe";
import { callStructured, describeAiError, imageBlock, textBlock, type AiContent } from "../../lib/ai/client";
import { ReelAnalysisSchema, type ReelAnalysisAi } from "../../lib/ai/schemas";
import { REEL_ANALYSIS_SYSTEM, THIRTEEN_QUESTIONS, clientBlock, contextBlock, frameLabel, type ClientProfile } from "../../lib/ai/prompts";
import { runHeuristics, sceneInterest, type Finding, type SceneData, type CategoryScore } from "../../lib/analysis/heuristics";
import { HOOK_TEMPLATES, SHOT_GUIDES, MUSIC_MOODS, STYLE_MUSIC, HOOK_TYPE_LABELS, CAPTION_TEMPLATES, DEFAULT_CTA } from "../../lib/analysis/knowledge";
import { CATEGORY_LABELS, CATEGORY_MAX, type PlatformKey, type ServiceKey, type ScoreKey } from "../../lib/constants";
import { clamp, round } from "../../lib/utils";
import { ingestAsset, loadSamples } from "./ingest";
import { withWorkdir } from "../workdir";
import type { JobContext } from "../context";

type Json = Prisma.InputJsonValue;

export async function runAnalysisJob(analysisId: string, ctx: JobContext) {
  const analysis = await db.analysis.findUniqueOrThrow({
    where: { id: analysisId },
    include: { asset: true, project: { include: { client: true } } },
  });
  await db.analysis.update({ where: { id: analysisId }, data: { status: "RUNNING", error: null } });
  await db.project.update({ where: { id: analysis.projectId }, data: { status: "PROCESSING" } });
  const platform = (analysis.platform ?? analysis.project.platform ?? "instagram") as PlatformKey;
  const service = (analysis.service ?? analysis.project.service ?? "other") as ServiceKey;
  const goal = analysis.goal ?? analysis.project.goal ?? null;
  const warnings: string[] = [];

  try {
    // 1. Przetworzenie pliku (metadane, proxy, sceny, statystyki, audio)
    const asset = await ingestAsset(analysis.assetId, ctx.scoped(0, 45), ctx.signal);
    const st = storage();
    const samples = await loadSamples(asset);
    const sceneRows = await db.scene.findMany({ where: { assetId: asset.id }, orderBy: { index: "asc" } });
    const audio = (asset.audioAnalysis ?? null) as AudioAnalysis | null;
    const probe = ((asset.metadata as { probe?: { aspectLabel?: string } })?.probe ?? {}) as { aspectLabel?: string };

    // 2. Transkrypcja mowy
    let transcript: Transcript | null = null;
    if (asset.hasAudio && transcriptionEnabled()) {
      await ctx.progress(48, "Transkrypcja mowy (język polski)");
      try {
        transcript = await withWorkdir(`tr-${asset.id}`, async (dir) => {
          const mp3 = await extractSpeechAudio(await st.localPath(asset.proxyKey ?? asset.storageKey), path.join(dir, "speech.mp3"), ctx.signal);
          return transcribe(mp3, ctx.signal);
        });
      } catch (e) {
        if (ctx.signal.aborted) throw e;
        warnings.push(`Transkrypcja nie powiodła się: ${(e as Error).message.slice(0, 200)}`);
      }
    } else if (asset.hasAudio) {
      warnings.push("Transkrypcja mowy nie jest skonfigurowana — narracja nie została przeanalizowana.");
    }

    // 3. Analiza heurystyczna (zawsze — to rzeczywiste pomiary)
    await ctx.progress(55, "Analiza tempa, jakości obrazu i struktury");
    const scenes: SceneData[] = sceneRows.map((s) => {
      const stats = statsForRange(samples, s.start, s.end);
      return { index: s.index, start: s.start, end: s.end, ...stats, interest: sceneInterest(stats) };
    });
    const techInput = {
      info: { durationSec: asset.durationSec ?? 0, width: asset.width, height: asset.height, fps: asset.fps, hasAudio: asset.hasAudio, aspectLabel: probe.aspectLabel ?? null },
      scenes,
      samples,
      audio,
      transcript,
      platform,
      goal,
    };
    let heur = runHeuristics(techInput);

    // 4. Analiza multimodalna AI
    let ai: ReelAnalysisAi | null = null;
    let model: string | null = null;
    if (aiEnabled()) {
      await ctx.progress(60, "Analiza AI: klatki, sceny, przekaz marketingowy");
      try {
        const content = await buildAiContent({
          assetId: asset.id,
          userId: asset.userId,
          proxyKey: asset.proxyKey ?? asset.storageKey,
          duration: asset.durationSec ?? 0,
          scenes,
          sceneRows,
          heur,
          audio,
          transcript,
          ctxText: contextBlock({ goal, platform, service }),
          client: analysis.project.client as ClientProfile | null,
          signal: ctx.signal,
        });
        await ctx.progress(65, "Analiza AI: ocena eksperta (to może potrwać do kilku minut)");
        const res = await callStructured({ schema: ReelAnalysisSchema, system: REEL_ANALYSIS_SYSTEM, content, effort: "high", maxTokens: 48000, signal: ctx.signal });
        ai = res.data;
        model = res.model;
        await db.usageEvent.create({ data: { userId: asset.userId, kind: "ai_analysis", units: res.usage.input + res.usage.output, meta: res.usage as Json } });
      } catch (e) {
        if (ctx.signal.aborted) throw e;
        warnings.push(`Analiza AI nie powiodła się (${describeAiError(e)}). Pokazano wyłącznie analizę techniczną.`);
      }
    } else {
      warnings.push("Tryb heurystyczny: brak klucza API modelu AI. Wyniki oparte wyłącznie na pomiarach technicznych; treść obrazu nie była interpretowana.");
    }

    await ctx.progress(92, "Zapisywanie raportu");
    const dur = asset.durationSec ?? 0;

    // 5. Połączenie wyników
    let categories: CategoryScore[] = heur.categories;
    let findings: Finding[] = heur.findings;
    let total = heur.total;
    let summary = heur.summary;
    let strengths = heur.strengths;
    let weaknesses = heur.weaknesses;
    let priorityFixes = heur.priorityFixes;
    let optimal = heur.optimalLength;
    let hooks: unknown;
    let missingShots: unknown;
    let captionIdeas: unknown;
    let musicAdvice: unknown;
    let questions: unknown = null;
    let onScreenText: unknown = null;

    if (ai) {
      // aktualizacja scen o dane AI
      for (const s of ai.scenes) {
        const row = sceneRows.find((r) => r.index === s.index);
        if (!row) continue;
        await db.scene.update({
          where: { id: row.id },
          data: {
            description: s.description,
            category: s.category,
            interestScore: clamp(s.interestScore, 0, 10),
            qualityScore: clamp(s.qualityScore, 0, 10),
            hookPotential: clamp(s.hookPotential, 0, 10),
            aiData: { ...((row.aiData as object) ?? {}), visibleText: s.visibleText } as Json,
          },
        });
        const sc = scenes.find((x) => x.index === s.index);
        if (sc) sc.ai = { description: s.description, category: s.category, interestScore: clamp(s.interestScore, 0, 10), hookPotential: clamp(s.hookPotential, 0, 10) };
      }
      heur = runHeuristics({ ...techInput, scenes }); // retencja z uwzględnieniem ocen AI
      categories = (Object.keys(CATEGORY_MAX) as ScoreKey[]).map((key) => ({
        key,
        label: CATEGORY_LABELS[key],
        score: round(clamp(ai!.scores[key].score, 0, CATEGORY_MAX[key]), 1),
        maxScore: CATEGORY_MAX[key],
        rationale: ai!.scores[key].rationale,
        basis: "ai",
      }));
      total = round(categories.reduce((a, c) => a + (c.score ?? 0), 0), 0);
      const aiFindings: Finding[] = ai.findings
        .map((f) => ({
          start: round(clamp(f.start, 0, dur), 2),
          end: round(clamp(Math.max(f.end, f.start + 0.2), 0, dur), 2),
          severity: f.severity,
          category: f.category,
          shotDescription: f.shotDescription,
          problem: f.problem,
          reason: f.reason,
          suggestion: f.suggestion,
          suggestedCaption: f.suggestedCaption,
          newShotDuration: f.newShotDuration === null ? null : clamp(f.newShotDuration, 0.3, 10),
          priority: clamp(Math.round(f.priority), 1, 5),
          source: "ai" as const,
        }))
        .filter((f) => f.end > f.start);
      // techniczne uwagi (audio, ciemne/nieostre fragmenty) uzupełniają analizę AI
      const tech = heur.findings.filter((f) => f.category === "audio" || (f.category === "visual" && f.severity !== "GOOD" && /ciemny|nieostry|rozmyty|Niedoświetlony|Obraz jest rozmyty/i.test(`${f.shotDescription} ${f.problem}`)));
      findings = [...aiFindings, ...tech].sort((a, b) => a.start - b.start || a.priority - b.priority);
      summary = ai.summary;
      strengths = ai.strengths.slice(0, 8);
      weaknesses = ai.weaknesses.slice(0, 8);
      priorityFixes = ai.priorityFixes.slice(0, 7);
      optimal = { sec: round(clamp(ai.optimalLength.seconds, 5, 180), 1), note: ai.optimalLength.rationale };
      hooks = ai.hooks.map((h) => ({
        ...h,
        typeLabel: HOOK_TYPE_LABELS[h.type],
        sourceStart: h.sourceStart === null ? null : clamp(h.sourceStart, 0, dur),
        sourceEnd: h.sourceEnd === null ? null : clamp(h.sourceEnd, 0, dur),
        duration: clamp(h.duration, 0.6, 5),
        source: "ai",
      }));
      missingShots = { source: "ai", items: ai.missingShots };
      captionIdeas = { source: "ai", items: ai.captions.map((c) => ({ ...c, start: clamp(c.start, 0, dur), end: clamp(c.end, 0, dur) })) };
      musicAdvice = {
        source: "ai",
        ...ai.music,
        measured: audio ? { bpm: audio.tempo.bpm, confidence: audio.tempo.confidence, energyRises: audio.energyRises, lufs: audio.integratedLufs } : null,
      };
      questions = ai.questions.map((q, i) => ({ ...q, question: THIRTEEN_QUESTIONS[q.id - 1] ?? THIRTEEN_QUESTIONS[i] ?? q.question }));
      onScreenText = ai.onScreenText;
    } else {
      hooks = HOOK_TEMPLATES[service].map((h) => {
        const best = [...scenes].sort((a, b) => b.interest - a.interest)[0];
        return {
          ...h,
          typeLabel: HOOK_TYPE_LABELS[h.type],
          sourceStart: best && h.type === "wow" ? best.start : null,
          sourceEnd: best && h.type === "wow" ? Math.min(best.end, best.start + h.duration) : null,
          // bez AI nie da się potwierdzić, czy wymagane ujęcie jest w materiale
          needsNewFootage: null,
          unverified: true,
          source: "template",
        };
      });
      missingShots = { source: "template", items: SHOT_GUIDES[service] };
      const tmpl = CAPTION_TEMPLATES[service];
      const cta = analysis.project.client?.defaultCta ?? DEFAULT_CTA[0];
      captionIdeas = {
        source: "template",
        items: [
          { text: tmpl.hook[0], start: 0, end: Math.min(2, dur), kind: "hook" },
          { text: tmpl.process[0], start: dur * 0.3, end: dur * 0.3 + 2, kind: "process" },
          { text: tmpl.result[0], start: dur * 0.65, end: dur * 0.65 + 2, kind: "result" },
          { text: cta, start: Math.max(0, dur - 2.5), end: dur, kind: "cta" },
        ].map((c) => ({ ...c, start: round(clamp(c.start, 0, dur), 2), end: round(clamp(c.end, 0, dur), 2) })),
      };
      const moodKey = goal === "prestige" ? STYLE_MUSIC.premium : goal === "engagement" ? STYLE_MUSIC.viral : STYLE_MUSIC.sales;
      const mood = MUSIC_MOODS.find((m) => m.key === moodKey)!;
      musicAdvice = {
        source: "template",
        mood: mood.label,
        tempo: `${mood.bpm[0]}–${mood.bpm[1]} BPM`,
        bpmMin: mood.bpm[0],
        bpmMax: mood.bpm[1],
        start: "Muzyka od pierwszej klatki; pierwsze cięcie na mocny akcent.",
        accents: audio?.energyRises.map((r) => `Wzrost energii w ${r.toFixed(1).replace(".", ",")} s — dobre miejsce na mocne cięcie`) ?? [],
        cutSync: audio?.tempo.bpm ? `Wykryte tempo ${audio.tempo.bpm} BPM — tnij co ${round((60 / audio.tempo.bpm) * 2, 2)} s (co 2 beaty) dla dynamicznej wersji.` : "Tnij na mocne akcenty muzyki (co 2 lub 4 beaty).",
        recommendation: `${mood.description} (rekomendacja z biblioteki stylów — bez analizy AI).`,
        measured: audio ? { bpm: audio.tempo.bpm, confidence: audio.tempo.confidence, energyRises: audio.energyRises, lufs: audio.integratedLufs } : null,
      };
    }

    // 6. Zapis
    await db.$transaction([
      db.analysisFinding.deleteMany({ where: { analysisId } }),
      db.scoreCategory.deleteMany({ where: { analysisId } }),
      db.analysisFinding.createMany({ data: findings.map((f) => ({ ...f, analysisId })) }),
      db.scoreCategory.createMany({ data: categories.map((c) => ({ analysisId, key: c.key, label: c.label, score: c.score, maxScore: c.maxScore, rationale: c.rationale, basis: c.basis })) }),
      db.analysis.update({
        where: { id: analysisId },
        data: {
          status: "COMPLETED",
          mode: ai ? "AI" : "HEURISTIC",
          model,
          totalScore: total,
          summary,
          strengths,
          weaknesses,
          priorityFixes,
          optimalLengthSec: optimal.sec,
          optimalLengthNote: optimal.note,
          questions: (questions ?? undefined) as Json | undefined,
          hooks: hooks as Json,
          missingShots: missingShots as Json,
          musicAdvice: musicAdvice as Json,
          captionIdeas: captionIdeas as Json,
          retention: heur.retention as unknown as Json,
          transcript: (transcript ?? undefined) as Json | undefined,
          onScreenText: (onScreenText ?? undefined) as Json | undefined,
          technical: { metrics: heur.metrics, audio: audio ? { ...audio, energyDb: undefined } : null, totalScaled: ai ? false : heur.totalScaled, heuristicTotal: heur.total } as unknown as Json,
          warnings,
          completedAt: new Date(),
        },
      }),
      db.project.update({ where: { id: analysis.projectId }, data: { status: total >= 70 ? "ANALYZED" : "NEEDS_WORK", thumbnailAssetId: analysis.project.thumbnailAssetId ?? asset.id } }),
    ]);
    return { analysisId, total, mode: ai ? "AI" : "HEURISTIC" };
  } catch (err) {
    const cancelled = ctx.signal.aborted;
    await db.analysis.update({ where: { id: analysisId }, data: { status: cancelled ? "CANCELLED" : "FAILED", error: cancelled ? "Analiza anulowana." : (err as Error).message.slice(0, 500), warnings } });
    await db.project.update({ where: { id: analysis.projectId }, data: { status: cancelled ? "DRAFT" : "FAILED" } });
    throw err;
  }
}

interface AiContentInput {
  assetId: string;
  userId: string;
  proxyKey: string;
  duration: number;
  scenes: SceneData[];
  sceneRows: Array<{ index: number; start: number; end: number; frameKey: string | null }>;
  heur: ReturnType<typeof runHeuristics>;
  audio: AudioAnalysis | null;
  transcript: Transcript | null;
  ctxText: string;
  client: ClientProfile | null;
  signal: AbortSignal;
}

/** Buduje treść zapytania: dane techniczne + klatki z podpisami czasu (hook + każda scena). */
async function buildAiContent(i: AiContentInput): Promise<AiContent> {
  const st = storage();
  const maxFrames = env().AI_MAX_FRAMES;
  const content: AiContent = [];
  const technical = {
    czas_trwania_s: round(i.duration, 2),
    metryki: i.heur.metrics,
    sceny: i.scenes.map((s) => ({ index: s.index, start: round(s.start, 2), end: round(s.end, 2), dlugosc_s: round(s.end - s.start, 2), ruch: round(s.motion, 2), ostrosc: round(s.sharpness, 2), jasnosc: round(s.brightness, 2) })),
    audio: i.audio
      ? { lufs: i.audio.integratedLufs, true_peak_db: i.audio.truePeakDb, bpm: i.audio.tempo.bpm, pewnosc_bpm: i.audio.tempo.confidence, udzial_ciszy: i.audio.silenceRatio, cisza: i.audio.silences, wzrosty_energii_s: i.audio.energyRises }
      : "brak ścieżki audio",
    transkrypcja: i.transcript ? i.transcript.segments.map((s) => ({ start: s.start, end: s.end, tekst: s.text })) : "brak (mowa nieprzeanalizowana lub brak mowy)",
    uwagi_techniczne_heurystyki: i.heur.findings.filter((f) => f.severity !== "GOOD").map((f) => ({ start: f.start, end: f.end, problem: f.problem })),
  };
  content.push(
    textBlock(
      `${i.ctxText}\n\n${clientBlock(i.client)}\n\nDANE TECHNICZNE (pomiary FFmpeg):\n${JSON.stringify(technical)}\n\nPYTANIA (odpowiedz na wszystkie, id 1–13):\n${THIRTEEN_QUESTIONS.map((q, n) => `${n + 1}. ${q}`).join("\n")}\n\nPoniżej klatki z filmu w kolejności czasowej. Każda poprzedzona podpisem z czasem i sceną.`,
    ),
  );

  // klatki hooka (pierwsze sekundy) + po jednej na scenę (próbkowanie przy dużej liczbie scen)
  const hookTimes = [0.1, 0.8, 1.6, 2.6].filter((t) => t < i.duration - 0.05);
  const sceneBudget = Math.max(2, maxFrames - hookTimes.length);
  let sceneSel = i.sceneRows;
  if (sceneSel.length > sceneBudget) {
    const step = sceneSel.length / sceneBudget;
    sceneSel = Array.from({ length: sceneBudget }, (_, k) => sceneSel[Math.floor(k * step)]);
  }
  await withWorkdir(`frames-${i.assetId}`, async (dir) => {
    const proxy = await st.localPath(i.proxyKey);
    const frames: Array<{ t: number; buf: Buffer; scene: { index: number; start: number; end: number } }> = [];
    for (const t of hookTimes) {
      const p = await extractFrame(proxy, path.join(dir, `hook_${t}.jpg`), t, 512, i.signal);
      const sc = i.sceneRows.find((s) => t >= s.start && t < s.end) ?? i.sceneRows[0];
      frames.push({ t, buf: await fs.readFile(p), scene: sc });
    }
    for (const s of sceneSel) {
      const mid = s.start + (s.end - s.start) / 2;
      if (hookTimes.some((t) => Math.abs(t - mid) < 0.4)) continue;
      let buf: Buffer;
      if (s.frameKey) buf = await st.readBuffer(s.frameKey);
      else {
        const p = await extractFrame(proxy, path.join(dir, `s_${s.index}.jpg`), mid, 512, i.signal);
        buf = await fs.readFile(p);
        await st.putBuffer(assetKey(i.userId, i.assetId, `scene_${s.index}.jpg`), buf, "image/jpeg");
      }
      frames.push({ t: mid, buf, scene: s });
    }
    frames.sort((a, b) => a.t - b.t);
    for (const f of frames) {
      content.push(textBlock(frameLabel(f.t, f.scene.index, f.scene.start, f.scene.end)));
      content.push(imageBlock(f.buf));
    }
  });
  content.push(textBlock("Przygotuj pełną analizę zgodnie z wymaganiami. Pamiętaj: uwagi i czasy muszą odpowiadać rzeczywistej zawartości klatek i scen."));
  return content;
}
