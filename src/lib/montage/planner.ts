// Planer automatycznego montażu: z katalogu scen (AI lub heurystyka) buduje
// rzeczywisty dokument timeline — wybór fragmentów, historia, długości ujęć wg tempa,
// przejścia, napisy, muzyka, logo i dopasowanie cięć do beatów.

import { PACES, type MontageStyle, type PaceKey, type ServiceKey, type ShotCategory, type PlatformKey, SHOT_CATEGORIES } from "../constants";
import { bestWindow, type FrameSample } from "../media/video-analysis";
import { CAPTION_TEMPLATES, DEFAULT_CTA } from "../analysis/knowledge";
import { emptyDoc, type AssetMap, type CaptionPresetKey, type TimelineDoc, type VideoItem } from "../timeline/types";
import { clipDuration, fitToDuration, layoutVideo, makeText, newVideoItem, snapCutsToBeats, clampToDuration } from "../timeline/ops";
import { clamp, formatTimecode, round, uid } from "../utils";

export interface CandidateScene {
  assetId: string;
  assetName: string;
  sceneIndex: number;
  start: number;
  end: number;
  category: ShotCategory | null;
  interest: number; // 0..10
  quality: number; // 0..10
  hookPotential: number; // 0..10
  motion: number;
  sharpness: number;
  brightness: number;
  description?: string | null;
  /** Kolejność klipu przy uploadzie (fallback dla historii bez kategorii) */
  clipOrder: number;
}

export interface CaptionBank {
  hook: string[];
  process: string[];
  result: string[];
  benefit: string[];
  cta: string[];
}

export interface PlannerInput {
  scenes: CandidateScene[];
  samples: Record<string, FrameSample[]>;
  assets: AssetMap;
  style: MontageStyle;
  targetDuration: number;
  pace: PaceKey;
  service: ServiceKey;
  platform: PlatformKey;
  withCaptions: boolean;
  captions?: CaptionBank | null;
  client?: { defaultCta?: string | null; logoAssetId?: string | null; brandColors?: string[] } | null;
  music?: { assetId: string; durationSec: number; beats: number[]; energyRises: number[]; bpm: number | null } | null;
}

export interface PlanResult {
  doc: TimelineDoc;
  changelog: string[];
  stats: { durationSec: number; shots: number; avgShot: number; cutsPerSecond: number; captions: number; hook: string };
}

type Role = "hook" | "before" | "process" | "detail" | "result" | "cta";

const RESULT: ShotCategory[] = ["result", "reveal", "water"];
const DETAIL: ShotCategory[] = ["detail", "wheels", "water"];
const PROCESS: ShotCategory[] = ["polishing", "coating", "ppf", "washing", "decon", "interior", "upholstery", "worker"];
const BEFORE: ShotCategory[] = ["before"];
const PROCESS_ORDER: ShotCategory[] = ["washing", "decon", "polishing", "coating", "ppf", "upholstery", "interior", "worker"];

interface Section {
  role: Role;
  weight: number;
  cats: ShotCategory[];
}

const STRUCTURES: Record<MontageStyle, Section[]> = {
  viral: [
    { role: "process", weight: 0.5, cats: PROCESS },
    { role: "detail", weight: 0.2, cats: DETAIL },
    { role: "result", weight: 0.3, cats: RESULT },
  ],
  premium: [
    { role: "process", weight: 0.35, cats: PROCESS },
    { role: "detail", weight: 0.3, cats: DETAIL },
    { role: "result", weight: 0.35, cats: RESULT },
  ],
  sales: [
    { role: "before", weight: 0.2, cats: BEFORE },
    { role: "process", weight: 0.35, cats: PROCESS },
    { role: "result", weight: 0.3, cats: RESULT },
    { role: "detail", weight: 0.15, cats: DETAIL },
  ],
  minimal: [
    { role: "process", weight: 0.45, cats: PROCESS },
    { role: "result", weight: 0.55, cats: [...RESULT, ...DETAIL] },
  ],
  before_after: [
    { role: "before", weight: 0.35, cats: BEFORE },
    { role: "process", weight: 0.2, cats: PROCESS },
    { role: "result", weight: 0.45, cats: [...RESULT, ...DETAIL] },
  ],
  educational: [
    { role: "before", weight: 0.15, cats: BEFORE },
    { role: "process", weight: 0.6, cats: PROCESS },
    { role: "result", weight: 0.25, cats: RESULT },
  ],
};

const STYLE_SHOT_K: Record<MontageStyle, number> = { viral: 0.85, premium: 1.25, sales: 1, minimal: 1.45, before_after: 1, educational: 1.2 };
const STYLE_PRESET: Record<MontageStyle, CaptionPresetKey> = {
  viral: "bold_viral",
  premium: "luxury",
  sales: "clean_modern",
  minimal: "minimal_premium",
  before_after: "bold_viral",
  educational: "clean_modern",
};

const ROLE_LABEL: Record<Role, string> = { hook: "hook", before: "stan przed", process: "proces", detail: "detale", result: "efekt", cta: "zakończenie z CTA" };

function windowScore(style: MontageStyle) {
  if (style === "viral") return (n: { motion: number; sharpness: number }) => 0.6 * Math.min(1, n.motion * 1.8) + 0.4 * n.sharpness;
  if (style === "premium" || style === "minimal") return (n: { motion: number; sharpness: number }) => 0.65 * n.sharpness + 0.35 * (1 - Math.min(1, Math.abs(n.motion - 0.2) * 2.5));
  return (n: { motion: number; sharpness: number }) => 0.5 * n.sharpness + 0.5 * Math.min(1, n.motion * 1.6);
}

function baseScore(s: CandidateScene) {
  return s.interest * 0.55 + s.quality * 0.35 + (s.brightness < 0.15 ? -2 : 0);
}

/** Wybór najlepszego okna w scenie z uwzględnieniem już użytych zakresów. */
function pickWindow(s: CandidateScene, len: number, used: Array<{ assetId: string; start: number; end: number }>, samples: FrameSample[], style: MontageStyle) {
  const free: Array<[number, number]> = [[s.start, s.end]];
  for (const u of used.filter((x) => x.assetId === s.assetId)) {
    for (let i = free.length - 1; i >= 0; i--) {
      const [a, b] = free[i];
      if (u.end <= a || u.start >= b) continue;
      free.splice(i, 1);
      if (u.start - a >= 0.4) free.push([a, u.start]);
      if (b - u.end >= 0.4) free.push([u.end, b]);
    }
  }
  let best: { start: number; end: number; score: number } | null = null;
  for (const [a, b] of free) {
    if (b - a < Math.min(len, 0.5)) continue;
    const w = bestWindow(samples, a, b, Math.min(len, b - a), windowScore(style));
    if (!best || w.score > best.score) best = w;
  }
  return best;
}

export function planMontage(input: PlannerInput): PlanResult {
  const changelog: string[] = [];
  const pace = PACES[input.pace];
  const k = STYLE_SHOT_K[input.style];
  const shotMin = pace.shot[0] * k;
  const shotMax = pace.shot[1] * k;
  const target = clamp(input.targetDuration, 5, 120);
  const hasCategories = input.scenes.some((s) => s.category);

  // 1. Odrzucenie słabych technicznie fragmentów, jeśli są alternatywy
  const usable = input.scenes.filter((s) => s.end - s.start >= 0.4);
  const strong = usable.filter((s) => s.quality >= 3 && s.sharpness >= 0.3 && s.brightness >= 0.1);
  const pool = strong.length >= Math.max(3, Math.ceil(target / shotMax)) ? strong : usable;
  if (pool.length < usable.length) changelog.push(`Odrzucono ${usable.length - pool.length} słabych technicznie fragmentów (nieostre/ciemne), bo dostępne były lepsze alternatywy.`);
  if (!pool.length) throw new Error("Brak użytecznych fragmentów wideo do montażu.");

  const used: Array<{ assetId: string; start: number; end: number }> = [];
  const plan: Array<{ scene: CandidateScene; start: number; end: number; role: Role }> = [];
  const take = (s: CandidateScene, len: number, role: Role) => {
    const w = pickWindow(s, len, used, input.samples[s.assetId] ?? [], input.style);
    if (!w || w.end - w.start < 0.35) return false;
    used.push({ assetId: s.assetId, start: w.start - 0.1, end: w.end + 0.1 });
    plan.push({ scene: s, start: w.start, end: w.end, role });
    return true;
  };

  // 2. Hook — najwyższy potencjał (efekt/detal/woda/stan przed wg stylu)
  const hookCats: ShotCategory[] = input.style === "sales" || input.style === "before_after" ? ["before", ...RESULT, "detail"] : [...RESULT, "detail", "before"];
  const hookCands = [...pool].sort((a, b) => {
    const bonus = (s: CandidateScene) => (s.category && hookCats.includes(s.category) ? 2 - hookCats.indexOf(s.category) * 0.2 : 0);
    return b.hookPotential + bonus(b) + baseScore(b) * 0.3 - (a.hookPotential + bonus(a) + baseScore(a) * 0.3);
  });
  const hookLen = input.style === "viral" ? clamp(shotMin * 1.3, 0.9, 1.4) : input.style === "premium" || input.style === "minimal" ? clamp(shotMax * 0.8, 1.6, 2.4) : clamp((shotMin + shotMax) / 2, 1.2, 1.8);
  for (const c of hookCands) {
    if (take(c, hookLen, "hook")) {
      changelog.push(`Hook: ${c.description ?? (c.category ? SHOT_CATEGORIES[c.category] : `scena ${c.sceneIndex + 1}`)} z „${c.assetName}” (${formatTimecode(plan[0].start)}–${formatTimecode(plan[0].end)}) — najwyższy potencjał na przyciągnięcie uwagi.`);
      break;
    }
  }

  // 3. Zakończenie (CTA) — rezerwujemy najlepszy efekt końcowy
  const ctaLen = clamp(shotMax * 1.1, 1.8, 3);
  const endCands = [...pool]
    .filter((s) => !hasCategories || (s.category && [...RESULT, "detail"].includes(s.category)))
    .sort((a, b) => baseScore(b) - baseScore(a));
  const endScene = (endCands.length ? endCands : [...pool].sort((a, b) => b.clipOrder - a.clipOrder || b.start - a.start))[0];

  // 4. Sekcje środkowe
  const middleBudget = Math.max(0, target - hookLen - ctaLen);
  const sections = STRUCTURES[input.style];
  const middle: typeof plan = [];
  for (const sec of sections) {
    const budget = middleBudget * sec.weight;
    let filled = 0;
    let cands = pool.filter((s) => (hasCategories ? s.category && sec.cats.includes(s.category) : true));
    if (!hasCategories) {
      // bez kategorii: historia wg kolejności klipów (wcześniejsze = proces, późniejsze = efekt)
      const maxOrder = Math.max(...pool.map((s) => s.clipOrder));
      const frac = (s: CandidateScene) => (maxOrder ? s.clipOrder / maxOrder : 0.5);
      cands = pool.filter((s) => (sec.role === "result" ? frac(s) >= 0.5 : sec.role === "before" ? frac(s) <= 0.25 : frac(s) < 0.75));
    }
    if (sec.role === "process" && input.style === "educational") {
      cands.sort((a, b) => PROCESS_ORDER.indexOf(a.category ?? "worker") - PROCESS_ORDER.indexOf(b.category ?? "worker") || baseScore(b) - baseScore(a));
    } else {
      cands.sort((a, b) => baseScore(b) - baseScore(a));
    }
    let lastAsset: string | null = null;
    for (let guard = 0; guard < 60 && filled < budget - shotMin * 0.5; guard++) {
      // preferujemy inne nagranie niż poprzednie ujęcie i nie zużywamy sceny zarezerwowanej na finał
      const preferred = cands.filter((c) => c !== endScene && c.assetId !== lastAsset);
      const order = [...preferred, ...cands.filter((c) => c !== endScene && !preferred.includes(c)), ...cands.filter((c) => c === endScene)];
      const pick = order.find((c) => pickWindow(c, shotMin, used, input.samples[c.assetId] ?? [], input.style));
      if (!pick) break;
      // celujemy w środek zakresu tempa (różnorodność długości ujęć), nie w maksimum
      const ideal = shotMin + (shotMax - shotMin) * (0.35 + 0.3 * ((middle.length * 7) % 10) / 10);
      const len = clamp(Math.min(ideal, budget - filled), shotMin, shotMax);
      const before = plan.length;
      if (!take(pick, len, sec.role)) {
        cands = cands.filter((c) => c !== pick);
        continue;
      }
      const added = plan.splice(before, 1)[0];
      middle.push(added);
      filled += added.end - added.start;
      lastAsset = pick.assetId;
      // rotacja: przesuwamy wybraną scenę na koniec kolejki (różnorodność)
      cands = [...cands.filter((c) => c !== pick), pick];
    }
    if (filled > 0) changelog.push(`Sekcja „${ROLE_LABEL[sec.role]}”: ${middle.filter((m) => m.role === sec.role).length} ujęć, ok. ${filled.toFixed(1).replace(".", ",")} s.`);
  }
  plan.push(...middle);
  if (endScene && take(endScene, ctaLen, "cta")) {
    changelog.push(`Zakończenie: ${endScene.description ?? `ujęcie z „${endScene.assetName}”`} — dłuższe ujęcie efektu pod napis z CTA.`);
  }

  // 5. Budowa timeline
  const preset = STYLE_PRESET[input.style];
  const doc = emptyDoc({ platform: input.platform, captionPreset: preset, targetDuration: round(target, 2) });
  doc.video = plan.map((p, i) => {
    const asset = input.assets[p.scene.assetId];
    const item = newVideoItem(p.scene.assetId, p.start, p.end, {
      role: p.role,
      label: p.scene.description ?? (p.scene.category ? SHOT_CATEGORIES[p.scene.category] : p.scene.assetName),
    });
    // kadr poziomy → środek kadru (użytkownik może przesunąć w edytorze)
    if (asset && asset.width && asset.height && asset.width > asset.height) item.crop = { x: 0.5, y: 0.5, zoom: 1 };
    const prev = plan[i - 1];
    if (i > 0 && prev) {
      const boundary = prev.role !== p.role;
      if (input.style === "minimal") item.transition = { type: "fade", duration: 0.45 };
      else if (input.style === "premium" && boundary) item.transition = { type: "fade", duration: 0.35 };
      else if (input.style === "before_after" && prev.role === "before" && p.role !== "before") item.transition = { type: "fadeblack", duration: 0.4 };
    }
    return item;
  });
  if (doc.video.length && ["premium", "minimal", "sales"].includes(input.style)) doc.video[doc.video.length - 1].fadeOut = 0.4;
  const transitions = doc.video.filter((v) => v.transition.type !== "cut").length;
  changelog.push(transitions ? `Przejścia: ${transitions} miękkich przejść tylko na granicach sekcji — reszta to czyste cięcia (priorytet: jakość obrazu, nie efekty).` : "Przejścia: wyłącznie czyste cięcia — bez przypadkowych efektów.");

  // brakuje długości → najpierw dokładamy kolejne ujęcia (zamiast rozciągać istniejące)
  for (let guard = 0; guard < 30 && layoutVideo(doc).total < target - shotMin; guard++) {
    const extra = [...pool]
      .sort((a, b) => baseScore(b) - baseScore(a))
      .find((c) => c !== endScene && pickWindow(c, shotMin, used, input.samples[c.assetId] ?? [], input.style));
    if (!extra) break;
    const before = plan.length;
    const len = clamp(target - layoutVideo(doc).total, shotMin, (shotMin + shotMax) / 2);
    if (!take(extra, len, extra.category && RESULT.includes(extra.category) ? "result" : "process")) break;
    const added = plan.splice(before, 1)[0];
    // wstawiamy przed zakończeniem (CTA)
    const at = Math.max(1, doc.video.length - 1);
    doc.video.splice(at, 0, newVideoItem(added.scene.assetId, added.start, added.end, { role: added.role, label: added.scene.description ?? (added.scene.category ? SHOT_CATEGORIES[added.scene.category] : added.scene.assetName) }));
    plan.splice(at, 0, added);
  }
  let out = fitToDuration(doc, target, input.assets, { protectFirst: true, minShot: Math.max(0.4, shotMin * 0.8), maxShot: shotMax * 1.15 });

  // 6. Muzyka
  if (input.music) {
    const m = input.music;
    const total = layoutVideo(out).total;
    const rise = m.energyRises.find((r) => r > 2 && r < m.durationSec - total);
    // jeśli w utworze jest wyraźne wejście, zaczynamy tak, by trafiło w początek efektu końcowego
    const resultStart = layoutVideo(out).entries[Math.max(0, out.video.findIndex((v) => v.role === "result" || v.role === "cta"))]?.start ?? 0;
    const sourceIn = rise ? clamp(rise - resultStart, 0, Math.max(0, m.durationSec - total)) : 0;
    out = {
      ...out,
      audio: [{ id: uid("a"), assetId: m.assetId, start: 0, sourceIn: round(sourceIn, 3), sourceOut: round(Math.min(m.durationSec, sourceIn + total + 0.5), 3), volume: input.style === "viral" ? 0.9 : 0.8, fadeIn: 0.25, fadeOut: 1.2, label: "Muzyka" }],
      settings: { ...out.settings, muteOriginal: input.style !== "educational" && input.style !== "sales" },
      video: out.video.map((v) => (input.style === "educational" || input.style === "sales" ? { ...v, volume: 0.3 } : v)),
    };
    if (rise) changelog.push(`Muzyka: start utworu ustawiony tak, by mocniejsze wejście (${rise.toFixed(1).replace(".", ",")} s utworu) zbiegło się z pokazaniem efektu.`);
    if (m.beats.length) {
      out = snapCutsToBeats(out, m.beats, input.assets, Math.min(0.3, shotMin * 0.4));
      changelog.push(`Cięcia dopasowane do beatów muzyki${m.bpm ? ` (${m.bpm} BPM)` : ""}.`);
    }
    if (out.settings.muteOriginal) changelog.push("Oryginalny dźwięk klipów wyciszony — prowadzi muzyka.");
  }

  // 7. Napisy
  if (input.withCaptions && out.video.length) {
    const bank = input.captions ?? null;
    const tmpl = CAPTION_TEMPLATES[input.service] ?? CAPTION_TEMPLATES.other;
    const pickText = (arr: string[] | undefined, fallback: string[]) => (arr && arr.length ? arr[0] : fallback[0]);
    const { entries } = layoutVideo(out);
    const addAnchored = (index: number, text: string, kind: "caption" | "cta", minLen = 1.2) => {
      const e = entries[index];
      if (!e) return;
      const len = clamp(Math.max(minLen, e.duration - 0.15), 1, 2.6);
      const t = makeText(text, e.start + 0.08, Math.min(layoutVideo(out).total, e.start + 0.08 + len), { kind, preset, anchor: { itemId: out.video[index].id, offset: 0.08 } });
      if (input.client?.brandColors?.[0] && /^#[0-9a-fA-F]{6}$/.test(input.client.brandColors[0])) t.style.highlightColor = input.client.brandColors[0].toUpperCase();
      out.texts.push(t);
    };
    const roleIdx = (r: Role) => out.video.findIndex((v) => v.role === r);
    const hookText = input.style === "sales" || input.style === "before_after" ? pickText(bank?.hook, tmpl.hook.slice(0, 1)) : pickText(bank?.hook, tmpl.hook);
    addAnchored(0, hookText, "caption", 1.4);
    const pIdx = roleIdx("process");
    if (pIdx > 0) addAnchored(pIdx, pickText(bank?.process, tmpl.process), "caption");
    const rIdx = roleIdx("result") > 0 ? roleIdx("result") : roleIdx("detail");
    if (rIdx > 0 && rIdx !== out.video.length - 1) addAnchored(rIdx, pickText(bank?.result, tmpl.result), "caption");
    const cta = input.client?.defaultCta?.trim() || bank?.cta?.[0] || DEFAULT_CTA[0];
    addAnchored(out.video.length - 1, cta, "cta", 1.8);
    changelog.push(`Napisy: ${out.texts.length} (${bank ? "propozycje AI" : "szablony dla wybranej usługi"}), CTA na końcu: „${cta}”. Styl: ${preset}.`);
  }

  // 8. Logo klienta na planszy końcowej
  if (input.client?.logoAssetId && out.video.length) {
    const total = layoutVideo(out).total;
    out.logos.push({ id: uid("l"), assetId: input.client.logoAssetId, start: round(Math.max(0, total - 2.5), 3), end: round(total, 3), position: { x: 0.5, y: 0.17 }, width: 0.28, opacity: 1 });
    changelog.push("Logo klienta na ostatnich 2,5 s (w bezpiecznej strefie u góry kadru).");
  }

  out = clampToDuration(out);
  const { total } = layoutVideo(out);
  const shots = out.video.length;
  return {
    doc: out,
    changelog,
    stats: {
      durationSec: round(total, 2),
      shots,
      avgShot: round(out.video.reduce((a, v) => a + clipDuration(v), 0) / Math.max(1, shots), 2),
      cutsPerSecond: round(Math.max(0, shots - 1) / Math.max(1, total), 2),
      captions: out.texts.length,
      hook: plan[0]?.scene.description ?? (plan[0]?.scene.category ? SHOT_CATEGORIES[plan[0].scene.category] : "pierwsze ujęcie"),
    },
  };
}

export const VARIANT_PRESETS: Record<"VIRAL" | "PREMIUM" | "SALES", { style: MontageStyle; pace: PaceKey; label: string; summary: string; useCase: string }> = {
  VIRAL: {
    style: "viral",
    pace: "very_dynamic",
    label: "Wersja A — VIRAL",
    summary: "Mocny hook, szybkie cięcia, wyraziste napisy, dynamiczna struktura.",
    useCase: "Zasięgi i nowi odbiorcy — TikTok, Reels nastawione na wyświetlenia.",
  },
  PREMIUM: {
    style: "premium",
    pace: "balanced",
    label: "Wersja B — PREMIUM",
    summary: "Dopracowana kompozycja, wolniejsze ujęcia, eleganckie napisy, mniej efektów.",
    useCase: "Budowanie prestiżu marki i klienci premium — profil studia, portfolio.",
  },
  SALES: {
    style: "sales",
    pace: "dynamic",
    label: "Wersja C — SALES",
    summary: "Problem klienta → proces → rezultat → korzyści → wyraźne CTA.",
    useCase: "Pozyskiwanie klientów — reklama płatna, wiadomości i rezerwacje.",
  },
};

export function describeDoc(doc: TimelineDoc) {
  const { total, entries } = layoutVideo(doc);
  return {
    durationSec: round(total, 2),
    shots: doc.video.length,
    avgShot: round(entries.reduce((a, e) => a + e.duration, 0) / Math.max(1, entries.length), 2),
    cutsPerSecond: round(Math.max(0, doc.video.length - 1) / Math.max(1, total), 2),
    captions: doc.texts.length,
    transitions: doc.video.filter((v) => v.transition.type !== "cut").length,
  };
}

export type { VideoItem };
