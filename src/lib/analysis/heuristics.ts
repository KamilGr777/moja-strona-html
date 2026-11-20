// Silnik heurystyczny: deterministyczna analiza na podstawie pomiarów FFmpeg
// (cięcia, ruch, jasność, ostrość, audio, transkrypcja). Nie interpretuje treści obrazu —
// kategorie wymagające rozumienia treści są oznaczane jako „brak danych” bez AI.

import { CATEGORY_LABELS, CATEGORY_MAX, PLATFORMS, type ScoreKey, type PlatformKey } from "../constants";
import { clamp, formatTimecode, mean, median, round } from "../utils";
import type { AudioAnalysis } from "../media/audio";
import { normalizeSample, type FrameSample } from "../media/video-analysis";
import type { Transcript } from "../ai/transcribe";
import { CTA_KEYWORDS, GOAL_LENGTH } from "./knowledge";

export interface SceneData {
  index: number;
  start: number;
  end: number;
  motion: number;
  brightness: number;
  sharpness: number;
  saturation: number;
  contrast: number;
  /** Heurystyczna atrakcyjność 0–10 */
  interest: number;
  ai?: { description?: string | null; category?: string | null; interestScore?: number | null; hookPotential?: number | null } | null;
}

export interface TechnicalInput {
  info: { durationSec: number; width: number | null; height: number | null; fps: number | null; hasAudio: boolean; aspectLabel: string | null };
  scenes: SceneData[];
  samples: FrameSample[];
  audio: AudioAnalysis | null;
  transcript: Transcript | null;
  platform: PlatformKey;
  goal: string | null;
}

export type Severity = "GOOD" | "WARN" | "BAD";

export interface Finding {
  start: number;
  end: number;
  severity: Severity;
  category: string;
  shotDescription: string;
  problem: string | null;
  reason: string | null;
  suggestion: string;
  suggestedCaption: string | null;
  newShotDuration: number | null;
  priority: number;
  source: "ai" | "heuristic";
}

export interface CategoryScore {
  key: ScoreKey;
  label: string;
  score: number | null;
  maxScore: number;
  rationale: string;
  basis: "ai" | "heuristic" | "unavailable";
}

export interface RetentionPoint {
  t: number;
  value: number;
}

export interface RetentionSegment {
  start: number;
  end: number;
  level: "strong" | "good" | "drop" | "weak";
  label: string;
}

export interface RetentionReport {
  points: RetentionPoint[];
  segments: RetentionSegment[];
  basis: "heuristic" | "heuristic+ai";
  disclaimer: string;
}

export interface Metrics {
  durationSec: number;
  cuts: number;
  avgShot: number;
  medianShot: number;
  longestShot: { start: number; end: number; length: number };
  firstCutAt: number | null;
  cutsFirst3s: number;
  motionFirst3s: number;
  avgMotion: number;
  avgSharpness: number;
  avgBrightness: number;
  darkRatio: number;
  blurryRatio: number;
  staticSegments: Array<{ start: number; end: number }>;
  darkSegments: Array<{ start: number; end: number }>;
  blurrySegments: Array<{ start: number; end: number }>;
  aspectOk: boolean;
  shortSide: number;
  speechWords: number;
  ctaInSpeech: { found: boolean; at: number | null; phrase: string | null };
  cutsPerSecond: number;
}

export const RETENTION_DISCLAIMER =
  "To heurystyczna prognoza atrakcyjności kolejnych fragmentów oparta na tempie cięć, ruchu w kadrze i jakości obrazu — nie są to dane o rzeczywistej retencji widzów z platformy.";

/** Atrakcyjność ujęcia 0–10 na podstawie pomiarów obrazu. */
export function sceneInterest(s: { motion: number; sharpness: number; contrast: number; saturation: number; brightness: number }) {
  const exposure = s.brightness < 0.15 ? 0.4 : s.brightness > 0.85 ? 0.7 : 1;
  const v = (0.42 * Math.min(1, s.motion * 1.6) + 0.3 * s.sharpness + 0.16 * s.contrast + 0.12 * s.saturation) * exposure;
  return round(clamp(v * 10, 0, 10), 2);
}

function segmentsWhere(samples: FrameSample[], pred: (n: ReturnType<typeof normalizeSample>) => boolean, minLen: number) {
  const out: Array<{ start: number; end: number }> = [];
  let s: number | null = null;
  let last = 0;
  const step = samples.length > 1 ? samples[1].t - samples[0].t : 0.25;
  for (const x of samples) {
    const hit = pred(normalizeSample(x));
    if (hit && s === null) s = x.t;
    if (!hit && s !== null) {
      if (x.t - s >= minLen) out.push({ start: round(s, 2), end: round(x.t, 2) });
      s = null;
    }
    last = x.t;
  }
  if (s !== null && last + step - s >= minLen) out.push({ start: round(s, 2), end: round(last + step, 2) });
  return out;
}

export function computeMetrics(input: TechnicalInput): Metrics {
  const { scenes, samples, info } = input;
  const dur = info.durationSec;
  const lengths = scenes.map((s) => s.end - s.start);
  const longestIdx = lengths.indexOf(Math.max(...lengths));
  const cuts = Math.max(0, scenes.length - 1);
  const firstCutAt = scenes.length > 1 ? scenes[1].start : null;
  const first3 = samples.filter((s) => s.t < 3).slice(1).map(normalizeSample);
  const all = samples.map(normalizeSample);
  const words = input.transcript?.segments.flatMap((s) => s.words) ?? [];
  let cta: Metrics["ctaInSpeech"] = { found: false, at: null, phrase: null };
  for (const seg of input.transcript?.segments ?? []) {
    const low = seg.text.toLowerCase();
    const kw = CTA_KEYWORDS.find((k) => low.includes(k));
    if (kw) cta = { found: true, at: seg.start, phrase: seg.text };
  }
  const shortSide = Math.min(info.width ?? 0, info.height ?? 0);
  return {
    durationSec: round(dur, 2),
    cuts,
    avgShot: round(dur / Math.max(1, scenes.length), 2),
    medianShot: round(median(lengths), 2),
    longestShot: { start: scenes[longestIdx]?.start ?? 0, end: scenes[longestIdx]?.end ?? dur, length: round(lengths[longestIdx] ?? dur, 2) },
    firstCutAt: firstCutAt === null ? null : round(firstCutAt, 2),
    cutsFirst3s: scenes.filter((s) => s.start > 0 && s.start < 3).length,
    motionFirst3s: round(mean(first3.map((x) => x.motion)), 3),
    avgMotion: round(mean(all.map((x) => x.motion)), 3),
    avgSharpness: round(mean(all.map((x) => x.sharpness)), 3),
    avgBrightness: round(mean(all.map((x) => x.brightness)), 3),
    darkRatio: round(all.filter((x) => x.brightness < 0.16).length / Math.max(1, all.length), 3),
    blurryRatio: round(all.filter((x) => x.sharpness < 0.3).length / Math.max(1, all.length), 3),
    staticSegments: segmentsWhere(samples.slice(1), (n) => n.motion < 0.05, 2),
    darkSegments: segmentsWhere(samples, (n) => n.brightness < 0.14, 1),
    blurrySegments: segmentsWhere(samples, (n) => n.sharpness < 0.28, 1),
    aspectOk: info.aspectLabel === "9:16",
    shortSide,
    speechWords: words.length,
    ctaInSpeech: cta,
    cutsPerSecond: round(cuts / Math.max(1, dur), 3),
  };
}

function idealShot(goal: string | null): [number, number] {
  if (goal === "prestige") return [1.6, 3.2];
  if (goal === "engagement") return [0.8, 1.8];
  if (goal === "education") return [1.6, 3.5];
  return [1.1, 2.6];
}

export function recommendedLength(goal: string | null, platform: PlatformKey): [number, number] {
  const g = GOAL_LENGTH[goal ?? "service"] ?? GOAL_LENGTH.service;
  const p = PLATFORMS[platform].recommended;
  return [Math.max(g[0], p[0] - 2), Math.min(g[1], p[1] + 10)];
}

export function scoreCategories(input: TechnicalInput, m: Metrics): CategoryScore[] {
  const startSamples = input.samples.filter((s) => s.t < 3).map(normalizeSample);
  const startBright = mean(startSamples.map((x) => x.brightness));
  const startSharp = mean(startSamples.map((x) => x.sharpness));
  const startAudio = input.audio ? mean(input.audio.energyDb.slice(0, 15)) : null;
  const cat = (key: ScoreKey, score: number | null, rationale: string, basis: CategoryScore["basis"] = "heuristic"): CategoryScore => ({
    key,
    label: CATEGORY_LABELS[key],
    score: score === null ? null : round(clamp(score, 0, CATEGORY_MAX[key]), 1),
    maxScore: CATEGORY_MAX[key],
    rationale,
    basis: score === null ? "unavailable" : basis,
  });

  // Hook (25)
  const firstCutScore = m.firstCutAt === null ? 0.15 : m.firstCutAt <= 1.6 ? 1 : m.firstCutAt <= 2.5 ? 0.75 : m.firstCutAt <= 3.5 ? 0.45 : 0.2;
  const hook =
    8 * clamp(m.motionFirst3s * 2.2, 0, 1) +
    6 * firstCutScore +
    4 * (startBright < 0.15 ? 0.3 : startBright > 0.9 ? 0.6 : 1) +
    4 * clamp(startSharp, 0, 1) +
    3 * (startAudio === null ? 0.5 : startAudio > -35 ? 1 : startAudio > -50 ? 0.5 : 0.1);
  const hookWhy = [
    m.firstCutAt === null ? "brak cięć w całym materiale" : `pierwsze cięcie w ${m.firstCutAt.toFixed(1).replace(".", ",")} s`,
    `ruch w pierwszych 3 s: ${m.motionFirst3s < 0.12 ? "niski" : m.motionFirst3s < 0.3 ? "umiarkowany" : "wysoki"}`,
    startBright < 0.15 ? "ciemny początek" : null,
    startAudio !== null && startAudio < -50 ? "cichy początek audio" : null,
  ].filter(Boolean).join(", ");

  // Jakość obrazu (20)
  const exposure = m.avgBrightness < 0.18 ? 0.35 : m.avgBrightness < 0.25 ? 0.7 : m.avgBrightness > 0.82 ? 0.6 : 1;
  const res = m.shortSide >= 1080 ? 1 : m.shortSide >= 720 ? 0.65 : 0.3;
  const aspect = m.aspectOk ? 1 : input.info.aspectLabel === "4:5" ? 0.5 : 0;
  const contrastAvg = mean(input.samples.map((s) => normalizeSample(s).contrast));
  const satAvg = mean(input.samples.map((s) => normalizeSample(s).saturation));
  const visual = 7 * m.avgSharpness + 4 * exposure + 3 * clamp(contrastAvg * 1.2, 0, 1) + 2 * clamp(satAvg * 1.4, 0, 1) + 2 * res + 2 * aspect;
  const visualWhy = [
    `ostrość ${m.avgSharpness > 0.65 ? "dobra" : m.avgSharpness > 0.4 ? "średnia" : "niska"}`,
    `ekspozycja ${exposure === 1 ? "prawidłowa" : m.avgBrightness < 0.25 ? "zbyt ciemna" : "zbyt jasna"}`,
    `rozdzielczość ${input.info.width}×${input.info.height}`,
    m.aspectOk ? "format 9:16" : `format ${input.info.aspectLabel} (wymaga kadrowania do 9:16)`,
  ].join(", ");

  // Tempo (15)
  const [lo, hi] = idealShot(input.goal);
  const shotFit = m.avgShot < lo * 0.6 ? 0.6 : m.avgShot < lo ? 0.85 : m.avgShot <= hi ? 1 : m.avgShot <= hi * 1.6 ? 0.55 : 0.2;
  const longest = m.longestShot.length <= 3.5 ? 1 : m.longestShot.length <= 5 ? 0.6 : m.longestShot.length <= 8 ? 0.3 : 0.1;
  const staticRatio = m.staticSegments.reduce((a, s) => a + s.end - s.start, 0) / Math.max(1, m.durationSec);
  const [rlo, rhi] = recommendedLength(input.goal, input.platform);
  const lenFit = m.durationSec >= rlo - 3 && m.durationSec <= rhi + 3 ? 1 : m.durationSec <= rhi * 1.6 ? 0.6 : 0.3;
  const pacing = 6 * shotFit + 3 * longest + 3 * (1 - clamp(staticRatio * 2, 0, 1)) + 3 * lenFit;
  const pacingWhy = `średnia długość ujęcia ${m.avgShot.toFixed(1).replace(".", ",")} s (zalecane ${String(lo).replace(".", ",")}–${String(hi).replace(".", ",")} s), najdłuższe ujęcie ${m.longestShot.length.toFixed(1).replace(".", ",")} s, ${m.cuts} cięć, długość ${m.durationSec.toFixed(1).replace(".", ",")} s`;

  // CTA (15) — tylko jeśli mamy transkrypcję mowy
  let cta: CategoryScore;
  if (input.transcript && m.speechWords > 3) {
    const late = m.ctaInSpeech.at !== null && m.ctaInSpeech.at > m.durationSec * 0.5;
    const s = m.ctaInSpeech.found ? (late ? 13 : 10) : 4;
    cta = cat("cta", s, m.ctaInSpeech.found ? `w narracji pada wezwanie do działania („${m.ctaInSpeech.phrase}”)` : "w narracji nie wykryto wezwania do działania; napisów na ekranie nie da się ocenić bez AI");
  } else {
    cta = cat("cta", null, "Ocena CTA wymaga odczytania napisów lub narracji — skonfiguruj AI lub transkrypcję.");
  }

  return [
    cat("hook", hook, `Pomiar techniczny: ${hookWhy}.`),
    cat("visual", visual, `Pomiar techniczny: ${visualWhy}.`),
    cat("clarity", null, "Czytelność przekazu wymaga zrozumienia treści obrazu — dostępna w analizie AI."),
    cat("pacing", pacing, `Pomiar techniczny: ${pacingWhy}.`),
    cta,
    cat("captions", null, "Ocena napisów na ekranie wymaga analizy obrazu przez AI."),
  ];
}

/** Wynik 0–100: suma kategorii; bez AI przeliczona proporcjonalnie z kategorii, które da się zmierzyć. */
export function totalScore(categories: CategoryScore[]): { total: number; scaled: boolean } {
  const avail = categories.filter((c) => c.score !== null);
  const sum = avail.reduce((a, c) => a + (c.score ?? 0), 0);
  const max = avail.reduce((a, c) => a + c.maxScore, 0);
  if (avail.length === categories.length) return { total: round(sum, 0), scaled: false };
  return { total: max ? round((sum / max) * 100, 0) : 0, scaled: true };
}

function sceneLabel(s: SceneData) {
  if (s.ai?.description) return s.ai.description;
  const motion = s.motion < 0.06 ? "statyczne ujęcie" : s.motion < 0.25 ? "spokojny ruch w kadrze" : "dużo ruchu w kadrze";
  const light = s.brightness < 0.18 ? "ciemne" : s.brightness > 0.8 ? "bardzo jasne" : "dobrze naświetlone";
  const sharp = s.sharpness < 0.35 ? "nieostre" : "ostre";
  return `Ujęcie ${s.index + 1} (${formatTimecode(s.start, false)}–${formatTimecode(s.end, false)}): ${motion}, ${light}, ${sharp}`;
}

export function heuristicFindings(input: TechnicalInput, m: Metrics): Finding[] {
  const f: Finding[] = [];
  const dur = m.durationSec;
  const best = [...input.scenes].sort((a, b) => b.interest - a.interest);
  const add = (x: Omit<Finding, "source" | "suggestedCaption" | "newShotDuration"> & Partial<Pick<Finding, "suggestedCaption" | "newShotDuration">>) =>
    f.push({ suggestedCaption: null, newShotDuration: null, ...x, start: round(x.start, 2), end: round(Math.min(dur, x.end), 2), source: "heuristic" });

  // Początek
  const first = input.scenes[0];
  if (first && (m.firstCutAt === null || m.firstCutAt > 3) && m.motionFirst3s < 0.2) {
    const strong = best.find((s) => s.start > 1);
    add({
      start: 0,
      end: Math.min(m.firstCutAt ?? dur, 4),
      severity: "BAD",
      category: "hook",
      shotDescription: sceneLabel(first),
      problem: "Spokojny, statyczny początek — przez pierwsze sekundy obraz niewiele się zmienia.",
      reason: "Na Reels/TikToku decyzja o przewinięciu zapada w 1–2 sekundy. Brak ruchu i cięcia na starcie obniża szansę na zatrzymanie widza.",
      suggestion: strong
        ? `Rozpocznij od najmocniejszego fragmentu materiału (${formatTimecode(strong.start, false)}–${formatTimecode(strong.end, false)}) skróconego do ok. 1,5 s, a obecny początek skróć do maks. 1 s.`
        : "Skróć ujęcie otwierające do maks. 1 s i dodaj cięcie lub ruch kamery w pierwszych 1,5 s.",
      newShotDuration: 1.5,
      priority: 1,
    });
  } else if (first && m.firstCutAt !== null && m.firstCutAt <= 2 && m.motionFirst3s >= 0.15) {
    add({
      start: 0,
      end: m.firstCutAt,
      severity: "GOOD",
      category: "hook",
      shotDescription: sceneLabel(first),
      problem: null,
      reason: "Szybkie pierwsze cięcie i ruch w kadrze pomagają zatrzymać widza.",
      suggestion: "Początek ma dobre tempo — upewnij się, że od razu widać efekt lub problem, którego dotyczy rolka.",
      priority: 5,
    });
  }

  // Długie ujęcia
  for (const s of input.scenes) {
    const len = s.end - s.start;
    if (len > 4.2 && !(s.index === 0 && f.some((x) => x.category === "hook" && x.severity === "BAD"))) {
      add({
        start: s.start,
        end: s.end,
        severity: len > 6.5 ? "BAD" : "WARN",
        category: "pacing",
        shotDescription: sceneLabel(s),
        problem: `Zbyt długie ujęcie (${len.toFixed(1).replace(".", ",")} s) pokazujące jedną czynność.`,
        reason: "Długie ujęcia bez zmiany kadru obniżają dynamikę i mogą spowodować przewinięcie rolki.",
        suggestion: "Skróć ujęcie do ok. 2 s, zostawiając najciekawszy fragment, albo podziel je na 2–3 krótsze ujęcia z różnych kadrów.",
        newShotDuration: 2,
        priority: len > 6.5 ? 1 : 2,
      });
    }
  }

  const overlap = (a: { start: number; end: number }, b: { start: number; end: number }) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) / Math.max(0.01, a.end - a.start);
  for (const seg of m.staticSegments) {
    if (f.some((x) => x.severity !== "GOOD" && overlap(seg, x) > 0.5)) continue;
    add({
      start: seg.start,
      end: seg.end,
      severity: "WARN",
      category: "pacing",
      shotDescription: "Statyczny fragment — minimalny ruch w kadrze.",
      problem: "Obraz prawie się nie zmienia przez ponad 2 sekundy.",
      reason: "Brak zmiany obrazu to typowe miejsce spadku zainteresowania.",
      suggestion: "Dodaj powolny najazd (zoom 100→110%), skróć fragment lub przykryj go ujęciem detalu.",
      priority: 3,
    });
  }

  for (const seg of m.darkSegments) {
    add({
      start: seg.start,
      end: seg.end,
      severity: "WARN",
      category: "visual",
      shotDescription: "Zbyt ciemny fragment.",
      problem: "Niedoświetlony obraz — lakier i detale są słabo widoczne.",
      reason: "W car detailingu jakość światła i połysk to główne argumenty wizualne.",
      suggestion: "Podbij ekspozycję w korekcji koloru lub zastąp ujęcie lepiej oświetlonym. Przy kolejnych nagraniach użyj lampy inspekcyjnej lub światła rozproszonego.",
      priority: 3,
    });
  }

  for (const seg of m.blurrySegments) {
    add({
      start: seg.start,
      end: seg.end,
      severity: seg.end - seg.start > 2 ? "BAD" : "WARN",
      category: "visual",
      shotDescription: "Nieostry fragment obrazu.",
      problem: "Obraz jest rozmyty (ostrość lub rozmycie ruchu).",
      reason: "Nieostre kadry obniżają postrzeganą jakość usługi premium.",
      suggestion: "Usuń lub skróć ten fragment; jeśli to jedyne ujęcie danej czynności, użyj go maks. przez 0,5–1 s.",
      priority: 2,
    });
  }

  // Najlepsze momenty
  for (const s of best.slice(0, 2)) {
    if (s.interest < 5) continue;
    add({
      start: s.start,
      end: s.end,
      severity: "GOOD",
      category: "visual",
      shotDescription: sceneLabel(s),
      problem: null,
      reason: "Jedno z najbardziej dynamicznych i najostrzejszych ujęć w materiale.",
      suggestion: s.start > 2 ? "Dobry kandydat na hook — rozważ wykorzystanie fragmentu również na początku filmu." : "Mocny moment — zachowaj go w montażu.",
      priority: 4,
    });
  }

  // Format
  if (!m.aspectOk) {
    add({
      start: 0,
      end: dur,
      severity: "BAD",
      category: "visual",
      shotDescription: `Materiał w proporcjach ${input.info.aspectLabel}.`,
      problem: "Film nie jest w pionowym formacie 9:16.",
      reason: "Reels, TikTok i Shorts wyświetlają pełnoekranowo pionowe wideo — inne proporcje dają czarne pasy lub mały obraz.",
      suggestion: "Przytnij kadr do 9:16 w edytorze (kadrowanie pionowe z ustawieniem środka kadru dla każdego ujęcia).",
      priority: 1,
    });
  }

  // Audio
  if (input.audio) {
    const a = input.audio;
    if (a.integratedLufs !== null && a.integratedLufs < -22) {
      add({ start: 0, end: dur, severity: "WARN", category: "audio", shotDescription: "Ścieżka audio całego filmu.", problem: `Zbyt cicha ścieżka (${a.integratedLufs.toFixed(1)} LUFS).`, reason: "Platformy normalizują głośność; bardzo cichy materiał brzmi słabo w porównaniu z innymi rolkami.", suggestion: "Włącz normalizację głośności do −14 LUFS w eksporcie.", priority: 3 });
    }
    if (a.truePeakDb !== null && a.truePeakDb > -0.5) {
      add({ start: 0, end: dur, severity: "WARN", category: "audio", shotDescription: "Ścieżka audio całego filmu.", problem: `Szczyty sygnału blisko 0 dBFS (${a.truePeakDb.toFixed(1)} dBTP) — ryzyko przesterowania.`, reason: "Po kompresji platformy przesterowania są słyszalne.", suggestion: "Włącz normalizację głośności (limit −1,5 dBTP) w eksporcie.", priority: 4 });
    }
    for (const s of a.silences.filter((x) => x.end - x.start >= 1.5)) {
      add({ start: s.start, end: s.end, severity: "WARN", category: "audio", shotDescription: "Cisza na ścieżce audio.", problem: "Fragment bez dźwięku.", reason: "Cisza w rolce reklamowej odbiera dynamikę.", suggestion: "Dodaj muzykę na całej długości filmu lub skróć ten fragment.", priority: 3 });
    }
  } else if (!input.info.hasAudio) {
    add({ start: 0, end: dur, severity: "WARN", category: "audio", shotDescription: "Brak ścieżki audio.", problem: "Film nie ma dźwięku.", reason: "Większość rolek jest oglądana z dźwiękiem — muzyka buduje rytm i klimat.", suggestion: "Dodaj legalnie licencjonowaną muzykę dopasowaną do tempa cięć.", priority: 2 });
  }

  // Długość
  const [rlo, rhi] = recommendedLength(input.goal, input.platform);
  if (dur > rhi + 3) {
    add({ start: rhi, end: dur, severity: "WARN", category: "pacing", shotDescription: "Końcówka filmu.", problem: `Film trwa ${dur.toFixed(0)} s — dłużej niż zalecane ${rlo}–${rhi} s dla tego celu.`, reason: "Dłuższe rolki rzadziej są oglądane do końca, a CTA na końcu traci zasięg.", suggestion: `Skróć materiał do ok. ${Math.round((rlo + rhi) / 2)} s, usuwając najsłabsze i powtarzające się ujęcia.`, priority: 2 });
  }

  // CTA (tylko gdy mamy transkrypcję)
  if (input.transcript && m.speechWords > 3 && !m.ctaInSpeech.found) {
    add({ start: Math.max(0, dur - 2.5), end: dur, severity: "WARN", category: "cta", shotDescription: "Zakończenie filmu.", problem: "W narracji brak wezwania do działania.", reason: "Bez CTA widz nie wie, co zrobić po obejrzeniu (np. umówić termin).", suggestion: "Zakończ film napisem lub kwestią z CTA, np. „Umów termin już dziś”.", suggestedCaption: "Umów termin już dziś", priority: 2 });
  }

  return f.sort((a, b) => a.start - b.start || a.priority - b.priority);
}

/** Heurystyczna krzywa atrakcyjności (co 0,5 s). */
export function retentionCurve(input: TechnicalInput, m: Metrics): RetentionReport {
  const dur = m.durationSec;
  const points: RetentionPoint[] = [];
  const step = 0.5;
  const cutTimes = input.scenes.slice(1).map((s) => s.start);
  const hasAi = input.scenes.some((s) => s.ai?.interestScore != null);
  let v = 100;
  const decays: number[] = [];
  for (let t = 0; t <= dur + 1e-6; t += step) {
    const pool = input.samples.filter((s) => s.t >= t && s.t < t + step).map(normalizeSample);
    const motion = mean(pool.map((p) => p.motion));
    const sharp = pool.length ? mean(pool.map((p) => p.sharpness)) : 0.6;
    const bright = pool.length ? mean(pool.map((p) => p.brightness)) : 0.5;
    const lastCut = Math.max(0, ...cutTimes.filter((c) => c <= t));
    const age = t - lastCut;
    const scene = input.scenes.find((s) => t >= s.start && t < s.end) ?? input.scenes[input.scenes.length - 1];
    let decay = 1.1;
    if (age > 3) decay += 1.6;
    if (age > 5) decay += 1.4;
    decay += motion < 0.05 ? 1.4 : motion < 0.12 ? 0.6 : -Math.min(1, motion * 2);
    if (bright < 0.15) decay += 0.8;
    if (sharp < 0.3) decay += 0.8;
    if (t < 3 && m.motionFirst3s < 0.15 && (m.firstCutAt === null || m.firstCutAt > 3)) decay += 2;
    const ai = scene?.ai?.interestScore;
    if (ai != null) decay -= (ai - 5) * 0.35;
    if (cutTimes.some((c) => c >= t && c < t + step)) decay -= 0.8;
    // rosnące zmęczenie przy dłuższych filmach
    decay += t > 20 ? 0.4 : 0;
    decay = clamp(decay, -1.5, 6);
    decays.push(decay);
    v = clamp(v - decay * step, 5, 100);
    points.push({ t: round(t, 2), value: round(v, 1) });
  }
  // segmenty
  const segments: RetentionSegment[] = [];
  const levelOf = (d: number): RetentionSegment["level"] => (d <= 0.6 ? "strong" : d <= 1.8 ? "good" : d <= 3 ? "drop" : "weak");
  const label: Record<RetentionSegment["level"], (s: number, e: number) => string> = {
    strong: (s) => (s < 1 ? "mocny początek" : "atrakcyjny, dynamiczny fragment"),
    good: () => "dobra dynamika",
    drop: () => "tempo spada — możliwy spadek zainteresowania",
    weak: () => "dłuższy statyczny lub słaby fragment — wymaga zmiany kadru lub skrócenia",
  };
  decays.forEach((d, i) => {
    const lvl = levelOf(d);
    const t = i * step;
    const last = segments[segments.length - 1];
    if (last && last.level === lvl) last.end = round(Math.min(dur, t + step), 2);
    else segments.push({ start: round(t, 2), end: round(Math.min(dur, t + step), 2), level: lvl, label: "" });
  });
  // scal bardzo krótkie segmenty (<1 s) z poprzednimi
  const merged: RetentionSegment[] = [];
  for (const s of segments) {
    const prev = merged[merged.length - 1];
    if (prev && s.end - s.start < 1) prev.end = s.end;
    else merged.push({ ...s });
  }
  // po scaleniu krótkich segmentów łączymy sąsiadujące segmenty o tym samym poziomie
  const final: RetentionSegment[] = [];
  for (const s of merged) {
    const prev = final[final.length - 1];
    if (prev && prev.level === s.level) prev.end = s.end;
    else final.push({ ...s });
  }
  final.forEach((s) => (s.label = label[s.level](s.start, s.end)));
  return { points, segments: final.filter((s) => s.end > s.start), basis: hasAi ? "heuristic+ai" : "heuristic", disclaimer: RETENTION_DISCLAIMER };
}

export interface HeuristicReport {
  metrics: Metrics;
  categories: CategoryScore[];
  total: number;
  totalScaled: boolean;
  findings: Finding[];
  retention: RetentionReport;
  optimalLength: { sec: number; note: string };
  strengths: string[];
  weaknesses: string[];
  priorityFixes: string[];
  summary: string;
}

export function runHeuristics(input: TechnicalInput): HeuristicReport {
  const metrics = computeMetrics(input);
  const categories = scoreCategories(input, metrics);
  const { total, scaled } = totalScore(categories);
  const findings = heuristicFindings(input, metrics);
  const retention = retentionCurve(input, metrics);
  const [rlo, rhi] = recommendedLength(input.goal, input.platform);
  const optimal = clamp(Math.min(metrics.durationSec, Math.round((rlo + rhi) / 2)), Math.min(rlo, metrics.durationSec), rhi);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (metrics.avgSharpness > 0.6) strengths.push("Ostry, czytelny obraz w większości ujęć.");
  if (metrics.firstCutAt !== null && metrics.firstCutAt <= 2) strengths.push("Szybkie pierwsze cięcie — dobre tempo otwarcia.");
  if (metrics.aspectOk) strengths.push("Prawidłowy pionowy format 9:16.");
  if (input.audio?.integratedLufs != null && input.audio.integratedLufs > -18 && input.audio.integratedLufs < -9) strengths.push("Prawidłowa głośność ścieżki audio.");
  if (metrics.avgShot >= 1 && metrics.avgShot <= 2.8) strengths.push("Średnia długość ujęć dobrze pasuje do krótkiej formy.");
  if (metrics.darkRatio > 0.2) weaknesses.push("Duża część materiału jest niedoświetlona.");
  if (metrics.blurryRatio > 0.2) weaknesses.push("W materiale są nieostre fragmenty.");
  if (metrics.longestShot.length > 4.5) weaknesses.push(`Najdłuższe ujęcie trwa ${metrics.longestShot.length.toFixed(1).replace(".", ",")} s — spowalnia tempo.`);
  if (!metrics.aspectOk) weaknesses.push("Materiał nie jest w formacie 9:16.");
  if (metrics.firstCutAt === null || metrics.firstCutAt > 3) weaknesses.push("Pierwsze cięcie pojawia się późno — słaby hook.");
  const priorityFixes = findings
    .filter((x) => x.severity !== "GOOD")
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((x) => x.suggestion);
  const summary = `Analiza techniczna (bez modelu AI): ${metrics.durationSec.toFixed(1).replace(".", ",")} s, ${metrics.cuts} cięć, średnio ${metrics.avgShot.toFixed(1).replace(".", ",")} s na ujęcie. ${weaknesses[0] ?? strengths[0] ?? ""} Ocena treści (czytelność przekazu, napisy, CTA na ekranie) wymaga skonfigurowania AI.`;
  return {
    metrics,
    categories,
    total,
    totalScaled: scaled,
    findings,
    retention,
    optimalLength: { sec: optimal, note: `Zalecana długość dla wybranego celu i platformy: ${rlo}–${rhi} s.` },
    strengths,
    weaknesses,
    priorityFixes,
    summary,
  };
}
