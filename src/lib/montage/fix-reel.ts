// „Popraw rolkę z AI”: na podstawie analizy (scen, uwag, propozycji AI) buduje
// nową wersję montażu z tego samego materiału źródłowego — nowy hook, skrócone
// ujęcia, usunięte słabe fragmenty, optymalna kolejność, napisy i CTA.

import { bestWindow, type FrameSample } from "../media/video-analysis";
import { CAPTION_TEMPLATES, DEFAULT_CTA } from "../analysis/knowledge";
import { emptyDoc, type AssetMap, type CaptionPresetKey, type TimelineDoc } from "../timeline/types";
import { clampToDuration, fitToDuration, layoutVideo, makeText, newVideoItem, clipDuration } from "../timeline/ops";
import { clamp, formatTimecode, round, uid } from "../utils";
import type { ServiceKey, PlatformKey } from "../constants";

export interface FixScene {
  index: number;
  start: number;
  end: number;
  interest: number;
  hookPotential: number;
  quality: number;
  sharpness: number;
  brightness: number;
  motion: number;
  category: string | null;
  description: string | null;
}

export interface FixFinding {
  start: number;
  end: number;
  severity: "GOOD" | "WARN" | "BAD";
  category: string;
  suggestedCaption: string | null;
}

export interface FixInput {
  assetId: string;
  durationSec: number;
  hasAudio: boolean;
  /** Mało mowy → audio traktujemy jako podkład muzyczny (zachowujemy ciągłość) */
  speechWords: number;
  scenes: FixScene[];
  findings: FixFinding[];
  samples: FrameSample[];
  assets: AssetMap;
  targetDuration: number;
  addCaptions: boolean;
  /** Tylko poprawa słabych momentów (zachowanie struktury) */
  mode: "full" | "weak-only";
  service: ServiceKey;
  platform: PlatformKey;
  preset: CaptionPresetKey;
  aiCaptions?: Array<{ text: string; start: number; end: number; kind: string }> | null;
  hookText?: string | null;
  client?: { defaultCta?: string | null; logoAssetId?: string | null } | null;
  weakSegments?: Array<{ start: number; end: number }>;
}

export interface FixResult {
  doc: TimelineDoc;
  changes: string[];
  comparison: {
    before: { durationSec: number; shots: number; avgShot: number; cutsPerSecond: number; hook: string };
    after: { durationSec: number; shots: number; avgShot: number; cutsPerSecond: number; hook: string };
  };
}

const MAX_SHOT = 2.6;

function sceneName(s: FixScene) {
  return s.description ?? `ujęcie ${s.index + 1} (${formatTimecode(s.start, false)}–${formatTimecode(s.end, false)})`;
}

export function fixReel(input: FixInput): FixResult {
  const changes: string[] = [];
  const scenes = [...input.scenes].sort((a, b) => a.start - b.start);
  if (!scenes.length) throw new Error("Brak scen do przebudowy.");
  const score = (s: FixScene) => s.interest * 0.6 + s.quality * 0.4;
  const scoreFn = (n: { motion: number; sharpness: number }) => 0.55 * n.sharpness + 0.45 * Math.min(1, n.motion * 1.6);
  const weak = (s: FixScene) =>
    s.sharpness < 0.28 ||
    s.brightness < 0.1 ||
    input.findings.some((f) => f.severity === "BAD" && ["visual"].includes(f.category) && f.start <= s.start + 0.2 && f.end >= s.end - 0.2);

  // 1. Hook
  const first = scenes[0];
  const hookBad = input.findings.some((f) => f.category === "hook" && f.severity === "BAD") || first.hookPotential < 5;
  const candidates = [...scenes].sort((a, b) => b.hookPotential + score(b) * 0.3 - (a.hookPotential + score(a) * 0.3));
  const hookScene = hookBad && input.mode === "full" ? candidates.find((s) => s.end - s.start >= 0.8 && !weak(s)) ?? first : first;
  const hookLen = clamp(Math.min(1.6, hookScene.end - hookScene.start), 0.8, 2);
  const hookWin = hookScene === first && !hookBad ? { start: first.start, end: first.start + Math.min(first.end - first.start, MAX_SHOT) } : bestWindow(input.samples, hookScene.start, hookScene.end, hookLen, scoreFn);
  if (hookScene !== first) changes.push(`Nowy początek: ${sceneName(hookScene)} (fragment ${formatTimecode(hookWin.start)}–${formatTimecode(hookWin.end)}) zamiast ${sceneName(first)}.`);
  else if (hookBad) changes.push(`Początek skrócony do ${round(hookWin.end - hookWin.start, 1).toString().replace(".", ",")} s.`);

  // 2. Rozwinięcie w oryginalnej kolejności (logika procesu), bez słabych fragmentów
  const items = [newVideoItem(input.assetId, hookWin.start, hookWin.end, { role: "hook", label: sceneName(hookScene) })];
  const lastScene = scenes[scenes.length - 1];
  let removed = 0;
  let shortened = 0;
  for (const s of scenes) {
    const isLast = s === lastScene;
    if (weak(s) && !isLast && scenes.length > 2) {
      removed++;
      changes.push(`Usunięto słaby technicznie fragment: ${sceneName(s)}.`);
      continue;
    }
    // wycinamy zakres użyty jako hook
    let a = s.start;
    let b = s.end;
    if (s === hookScene) {
      const before = hookWin.start - s.start;
      const after = s.end - hookWin.end;
      if (before < 1 && after < 1) continue;
      if (after >= before) a = hookWin.end + 0.1;
      else b = hookWin.start - 0.1;
    }
    const len = b - a;
    if (len < 0.4) continue;
    const inWeak = input.weakSegments?.some((w) => w.start <= a + 0.3 && w.end >= b - 0.3);
    const cap = isLast ? 3 : inWeak ? 1.4 : input.mode === "weak-only" ? Math.max(MAX_SHOT, Math.min(len, 3.5)) : MAX_SHOT;
    if (len > cap + 0.2) {
      const w = bestWindow(input.samples, a, b, cap, scoreFn);
      a = w.start;
      b = w.end;
      shortened++;
      changes.push(`Skrócono ${sceneName(s)} z ${len.toFixed(1).replace(".", ",")} s do ${(b - a).toFixed(1).replace(".", ",")} s (zostawiono najlepszy fragment).`);
    }
    items.push(newVideoItem(input.assetId, a, b, { role: isLast ? "cta" : "process", label: sceneName(s) }));
  }
  if (!removed && !shortened && hookScene === first) changes.push("Struktura materiału była poprawna — wprowadzono tylko drobne korekty długości.");

  const preset = input.preset;
  let doc = emptyDoc({ platform: input.platform, captionPreset: preset, targetDuration: round(input.targetDuration, 2) });
  doc.video = items;
  if (items.length > 1) doc.video[items.length - 1].fadeOut = 0.3;
  const beforeLen = layoutVideo(doc).total;
  doc = fitToDuration(doc, Math.min(input.targetDuration, beforeLen), input.assets, { protectFirst: true, minShot: 0.6 });
  const afterLen = layoutVideo(doc).total;
  if (Math.abs(afterLen - input.durationSec) > 0.5) changes.push(`Długość: ${input.durationSec.toFixed(1).replace(".", ",")} s → ${afterLen.toFixed(1).replace(".", ",")} s.`);

  // 3. Audio: przy braku mowy zachowujemy ciągłość podkładu muzycznego oryginału
  if (input.hasAudio && input.speechWords < 6) {
    doc.settings.muteOriginal = true;
    doc.audio = [{ id: uid("a"), assetId: input.assetId, start: 0, sourceIn: 0, sourceOut: round(Math.min(input.durationSec, afterLen + 0.3), 3), volume: 1, fadeIn: 0, fadeOut: 0.8, label: "Ścieżka dźwiękowa oryginału" }];
    changes.push("Ścieżka dźwiękowa oryginału zachowana w ciągłości (bez poszatkowania muzyki), z wyciszeniem na końcu.");
  }

  // 4. Napisy
  if (input.addCaptions) {
    const { entries, total } = layoutVideo(doc);
    const tmpl = CAPTION_TEMPLATES[input.service] ?? CAPTION_TEMPLATES.other;
    const add = (idx: number, text: string, kind: "caption" | "cta", minLen = 1.3) => {
      const e = entries[idx];
      if (!e) return;
      const len = clamp(Math.max(minLen, e.duration - 0.15), 1, 2.6);
      doc.texts.push(makeText(text, e.start + 0.08, Math.min(total, e.start + 0.08 + len), { kind, preset, anchor: { itemId: doc.video[idx].id, offset: 0.08 } }));
    };
    const hookCaption = input.hookText ?? input.aiCaptions?.find((c) => c.kind === "hook")?.text ?? tmpl.hook[0];
    add(0, hookCaption, "caption", 1.4);
    // napisy AI przypisane do czasu oryginału → mapujemy na nowe pozycje klipów
    for (const c of input.aiCaptions?.filter((x) => x.kind !== "hook" && x.kind !== "cta") ?? []) {
      const idx = doc.video.findIndex((v, i) => i > 0 && i < doc.video.length - 1 && c.start >= v.sourceIn - 0.3 && c.start < v.sourceOut);
      if (idx > 0 && !doc.texts.some((t) => t.anchor?.itemId === doc.video[idx].id)) add(idx, c.text, "caption");
    }
    if (doc.texts.length < 2 && doc.video.length > 2) add(Math.floor(doc.video.length / 2), tmpl.process[0], "caption");
    const cta = input.client?.defaultCta?.trim() || input.aiCaptions?.find((c) => c.kind === "cta")?.text || DEFAULT_CTA[0];
    add(doc.video.length - 1, cta, "cta", 1.8);
    changes.push(`Dodano ${doc.texts.length} napisów, w tym CTA na końcu: „${cta}”.`);
  }

  if (input.client?.logoAssetId) {
    const total = layoutVideo(doc).total;
    doc.logos.push({ id: uid("l"), assetId: input.client.logoAssetId, start: round(Math.max(0, total - 2.5), 3), end: round(total, 3), position: { x: 0.5, y: 0.17 }, width: 0.28, opacity: 1 });
  }
  doc = clampToDuration(doc);

  const stat = (d: number, shots: number, hook: string) => ({ durationSec: round(d, 2), shots, avgShot: round(d / Math.max(1, shots), 2), cutsPerSecond: round(Math.max(0, shots - 1) / Math.max(1, d), 2), hook });
  const after = layoutVideo(doc);
  return {
    doc,
    changes,
    comparison: {
      before: stat(input.durationSec, scenes.length, sceneName(first)),
      after: { ...stat(after.total, doc.video.length, sceneName(hookScene)), avgShot: round(doc.video.reduce((a, v) => a + clipDuration(v), 0) / Math.max(1, doc.video.length), 2) },
    },
  };
}
