import { z } from "zod";
import { clamp, round, uid } from "../utils";
import { CAPTION_PRESETS } from "./presets";
import {
  CAPTION_PRESET_KEYS,
  TEXT_ANIMATIONS,
  type AssetMap,
  type CaptionPresetKey,
  type TextItem,
  type TimelineDoc,
  type VideoItem,
  type AudioItem,
} from "./types";

export const MIN_CLIP = 0.2;

// ───────────────────────── Układ czasowy ─────────────────────────

export function clipDuration(v: Pick<VideoItem, "sourceIn" | "sourceOut" | "speed">) {
  return Math.max(0, (v.sourceOut - v.sourceIn) / v.speed);
}

export interface LayoutEntry {
  id: string;
  index: number;
  start: number;
  end: number;
  duration: number;
  /** Faktyczna długość przejścia wchodzącego (przycięta do długości klipów) */
  transition: number;
}

/** Pozycje klipów na ścieżce magnetycznej (z uwzględnieniem nakładania przejść). */
export function layoutVideo(doc: Pick<TimelineDoc, "video">): { entries: LayoutEntry[]; total: number } {
  const entries: LayoutEntry[] = [];
  let cursor = 0;
  doc.video.forEach((v, i) => {
    const d = clipDuration(v);
    let tr = 0;
    if (i > 0 && v.transition.type !== "cut") {
      const prev = entries[i - 1];
      tr = Math.min(v.transition.duration, d * 0.5, prev.duration * 0.5);
    }
    const start = Math.max(0, cursor - tr);
    entries.push({ id: v.id, index: i, start, end: start + d, duration: d, transition: tr });
    cursor = start + d;
  });
  return { entries, total: cursor };
}

export function totalDuration(doc: TimelineDoc): number {
  const { total } = layoutVideo(doc);
  return total;
}

/** Mapuje czas timeline na klip i czas w źródle (do podglądu i dzielenia). */
export function locate(doc: TimelineDoc, t: number): { item: VideoItem; index: number; sourceTime: number; entry: LayoutEntry } | null {
  const { entries } = layoutVideo(doc);
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (t >= e.start - 1e-6 && (t < e.end || i === entries.length - 1)) {
      const item = doc.video[i];
      const local = clamp(t - e.start, 0, e.duration);
      return { item, index: i, sourceTime: item.sourceIn + local * item.speed, entry: e };
    }
  }
  return null;
}

/** Aktualizuje czasy napisów przypiętych do klipów (po zmianie kolejności / przycięciu). */
export function syncAnchors(doc: TimelineDoc): TimelineDoc {
  const { entries, total } = layoutVideo(doc);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const texts = doc.texts.map((t) => {
    if (!t.anchor) return t;
    const e = byId.get(t.anchor.itemId);
    if (!e) {
      const { anchor: _a, ...rest } = t;
      void _a;
      return rest as TextItem;
    }
    const len = t.end - t.start;
    const start = clamp(e.start + t.anchor.offset, 0, Math.max(0, total - 0.2));
    const shift = start - t.start;
    return {
      ...t,
      start: round(start, 3),
      end: round(Math.min(total, start + len), 3),
      words: t.words?.map((w) => ({ ...w, start: round(w.start + shift, 3), end: round(w.end + shift, 3) })),
    };
  });
  return { ...doc, texts };
}

function withVideo(doc: TimelineDoc, video: VideoItem[]): TimelineDoc {
  return syncAnchors({ ...doc, video });
}

// ───────────────────────── Operacje na klipach ─────────────────────────

export function newVideoItem(assetId: string, sourceIn: number, sourceOut: number, extra: Partial<VideoItem> = {}): VideoItem {
  return {
    id: uid("v"),
    assetId,
    sourceIn: round(sourceIn, 3),
    sourceOut: round(sourceOut, 3),
    speed: 1,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    crop: { x: 0.5, y: 0.5, zoom: 1 },
    transition: { type: "cut", duration: 0 },
    ...extra,
  };
}

export function trimItem(doc: TimelineDoc, id: string, patch: { sourceIn?: number; sourceOut?: number }, assets: AssetMap): TimelineDoc {
  const video = doc.video.map((v) => {
    if (v.id !== id) return v;
    const max = assets[v.assetId]?.durationSec ?? v.sourceOut;
    let sIn = patch.sourceIn ?? v.sourceIn;
    let sOut = patch.sourceOut ?? v.sourceOut;
    sIn = clamp(sIn, 0, Math.max(0, max - MIN_CLIP));
    sOut = clamp(sOut, sIn + MIN_CLIP, max);
    return { ...v, sourceIn: round(sIn, 3), sourceOut: round(sOut, 3) };
  });
  return withVideo(doc, video);
}

export function moveItem(doc: TimelineDoc, id: string, toIndex: number): TimelineDoc {
  const from = doc.video.findIndex((v) => v.id === id);
  if (from < 0) return doc;
  const video = [...doc.video];
  const [it] = video.splice(from, 1);
  video.splice(clamp(Math.round(toIndex), 0, video.length), 0, it);
  return withVideo(doc, video);
}

/** Dzieli klip w punkcie czasu timeline. */
export function splitAt(doc: TimelineDoc, t: number): TimelineDoc {
  const hit = locate(doc, t);
  if (!hit) return doc;
  const { item, index, sourceTime } = hit;
  if (sourceTime - item.sourceIn < MIN_CLIP || item.sourceOut - sourceTime < MIN_CLIP) return doc;
  const a: VideoItem = { ...item, sourceOut: round(sourceTime, 3), fadeOut: 0 };
  const b: VideoItem = { ...item, id: uid("v"), sourceIn: round(sourceTime, 3), fadeIn: 0, transition: { type: "cut", duration: 0 } };
  const video = [...doc.video];
  video.splice(index, 1, a, b);
  return withVideo(doc, video);
}

export function duplicateItem(doc: TimelineDoc, id: string): TimelineDoc {
  const vi = doc.video.findIndex((v) => v.id === id);
  if (vi >= 0) {
    const video = [...doc.video];
    video.splice(vi + 1, 0, { ...doc.video[vi], id: uid("v"), transition: { type: "cut", duration: 0 } });
    return withVideo(doc, video);
  }
  const ti = doc.texts.findIndex((t) => t.id === id);
  if (ti >= 0) {
    const t = doc.texts[ti];
    const len = t.end - t.start;
    const { anchor: _anchor, ...rest } = t;
    void _anchor;
    return { ...doc, texts: [...doc.texts, { ...rest, id: uid("t"), start: t.end, end: t.end + len, words: undefined }] };
  }
  return doc;
}

export function removeItem(doc: TimelineDoc, id: string): TimelineDoc {
  if (doc.video.some((v) => v.id === id)) {
    const video = doc.video.filter((v) => v.id !== id);
    if (video.length && video[0].transition.type !== "cut") video[0] = { ...video[0], transition: { type: "cut", duration: 0 } };
    return withVideo(doc, video);
  }
  return {
    ...doc,
    audio: doc.audio.filter((a) => a.id !== id),
    texts: doc.texts.filter((t) => t.id !== id),
    logos: doc.logos.filter((l) => l.id !== id),
    blurs: doc.blurs.filter((b) => b.id !== id),
  };
}

export function updateVideoItem(doc: TimelineDoc, id: string, patch: Partial<Omit<VideoItem, "id" | "assetId">>): TimelineDoc {
  return withVideo(doc, doc.video.map((v) => (v.id === id ? { ...v, ...patch } : v)));
}

export function updateText(doc: TimelineDoc, id: string, patch: Partial<Omit<TextItem, "id">>): TimelineDoc {
  return {
    ...doc,
    texts: doc.texts.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      // ręczna zmiana czasu odpina napis od klipu
      if ((patch.start !== undefined || patch.end !== undefined) && !patch.anchor) delete next.anchor;
      if (patch.text !== undefined && patch.text !== t.text) next.words = undefined;
      if (next.end < next.start + 0.2) next.end = next.start + 0.2;
      return next;
    }),
  };
}

export function updateAudio(doc: TimelineDoc, id: string, patch: Partial<Omit<AudioItem, "id" | "assetId">>): TimelineDoc {
  return { ...doc, audio: doc.audio.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
}

export function makeText(
  text: string,
  start: number,
  end: number,
  opts: { kind?: TextItem["kind"]; preset?: CaptionPresetKey; y?: number; anchor?: TextItem["anchor"]; animation?: TextItem["animation"] } = {},
): TextItem {
  const p = CAPTION_PRESETS[opts.preset ?? "minimal_premium"];
  return {
    id: uid("t"),
    kind: opts.kind ?? "caption",
    text: text.slice(0, 300),
    start: round(start, 3),
    end: round(Math.max(end, start + 0.3), 3),
    style: { ...p.style },
    position: { x: 0.5, y: opts.y ?? p.y },
    animation: opts.animation ?? p.animation,
    ...(opts.anchor ? { anchor: opts.anchor } : {}),
  };
}

/** Zmienia styl wszystkich napisów na preset (zachowuje pozycję, jeśli zmieniona ręcznie). */
export function applyCaptionPreset(doc: TimelineDoc, preset: CaptionPresetKey): TimelineDoc {
  const p = CAPTION_PRESETS[preset];
  return {
    ...doc,
    settings: { ...doc.settings, captionPreset: preset },
    texts: doc.texts.map((t) => ({
      ...t,
      style: { ...p.style, ...(t.kind === "cta" ? { fontSize: Math.round(p.style.fontSize * 1.05) } : {}) },
      animation: t.kind === "transcript" ? "highlight" : p.animation,
    })),
  };
}

/**
 * Dopasowanie długości: skraca najdłuższe ujęcia (zachowując środek najlepszego fragmentu),
 * a przy wydłużaniu poszerza ujęcia w granicach materiału źródłowego.
 */
export function fitToDuration(doc: TimelineDoc, target: number, assets: AssetMap, opts: { protectFirst?: boolean; minShot?: number; maxShot?: number } = {}): TimelineDoc {
  const minShot = opts.minShot ?? 0.6;
  const maxShot = opts.maxShot ?? Infinity;
  let video = doc.video.map((v) => ({ ...v }));
  const current = layoutVideo({ video }).total;
  if (!video.length || Math.abs(current - target) < 0.15) return doc;

  if (current > target) {
    let excess = current - target;
    // usuń najkrótsze, nieistotne ujęcia jeśli nawet przy minimalnej długości nie zmieścimy się
    const minTotal = video.length * minShot;
    if (minTotal > target) {
      const keep = Math.max(1, Math.floor(target / minShot));
      video = video.slice(0, keep);
      excess = layoutVideo({ video }).total - target;
    }
    for (let guard = 0; guard < 200 && excess > 0.05; guard++) {
      const candidates = video
        .map((v, i) => ({ v, i, d: clipDuration(v) }))
        .filter((c) => c.d > minShot + 0.05 && !(opts.protectFirst && c.i === 0 && video.length > 1));
      if (!candidates.length) break;
      candidates.sort((a, b) => b.d - a.d);
      const c = candidates[0];
      const second = candidates[1]?.d ?? minShot;
      const cut = Math.min(excess, c.d - Math.max(minShot, second - 0.01), c.d - minShot);
      const step = Math.max(0.05, cut);
      const srcCut = step * c.v.speed;
      // przycinamy symetrycznie
      video[c.i] = { ...c.v, sourceIn: round(c.v.sourceIn + srcCut / 2, 3), sourceOut: round(c.v.sourceOut - srcCut / 2, 3) };
      excess -= step;
    }
  } else {
    let missing = target - current;
    for (let guard = 0; guard < 200 && missing > 0.05; guard++) {
      let grew = false;
      for (let i = 0; i < video.length && missing > 0.05; i++) {
        const v = video[i];
        if (opts.protectFirst && i === 0 && video.length > 1) continue;
        const max = assets[v.assetId]?.durationSec ?? v.sourceOut;
        const room = (max - v.sourceOut) + v.sourceIn;
        const headroom = maxShot - clipDuration(v);
        if (room < 0.05 || headroom < 0.05) continue;
        const add = Math.min(missing, 0.5, room / v.speed, headroom);
        const half = (add * v.speed) / 2;
        const inRoom = v.sourceIn;
        const outRoom = max - v.sourceOut;
        const addIn = Math.min(inRoom, half + Math.max(0, half - outRoom));
        const addOut = Math.min(outRoom, add * v.speed - addIn);
        video[i] = { ...v, sourceIn: round(v.sourceIn - addIn, 3), sourceOut: round(v.sourceOut + addOut, 3) };
        missing -= (addIn + addOut) / v.speed;
        grew = true;
      }
      if (!grew) break;
    }
  }
  return withVideo({ ...doc, settings: { ...doc.settings, targetDuration: round(target, 2) } }, video);
}

/** Przycina napisy, muzykę i logo do długości filmu. */
export function clampToDuration(doc: TimelineDoc): TimelineDoc {
  const total = totalDuration(doc);
  return {
    ...doc,
    texts: doc.texts.filter((t) => t.start < total - 0.1).map((t) => ({ ...t, end: Math.min(t.end, total) })),
    logos: doc.logos.filter((l) => l.start < total).map((l) => ({ ...l, end: Math.min(l.end, total) })),
    blurs: doc.blurs.filter((b) => b.start < total).map((b) => ({ ...b, end: Math.min(b.end, total) })),
  };
}

/** Przyciąga granice cięć do najbliższych beatów muzyki (jeśli odchylenie ≤ tolerancji). */
export function snapCutsToBeats(doc: TimelineDoc, beats: number[], assets: AssetMap, tolerance = 0.25): TimelineDoc {
  if (!beats.length || doc.video.length < 2) return doc;
  const music = doc.audio[0];
  const offset = music ? music.start - music.sourceIn : 0;
  const beatTimes = beats.map((b) => b + offset).filter((b) => b > 0);
  let video = doc.video;
  for (let i = 0; i < video.length - 1; i++) {
    const { entries } = layoutVideo({ video });
    const end = entries[i].end;
    const nearest = beatTimes.reduce((best, b) => (Math.abs(b - end) < Math.abs(best - end) ? b : best), beatTimes[0]);
    const delta = nearest - end;
    if (Math.abs(delta) > tolerance || Math.abs(delta) < 0.02) continue;
    const v = video[i];
    const max = assets[v.assetId]?.durationSec ?? v.sourceOut;
    const newOut = clamp(v.sourceOut + delta * v.speed, v.sourceIn + MIN_CLIP, max);
    video = video.map((x, j) => (j === i ? { ...x, sourceOut: round(newOut, 3) } : x));
  }
  return withVideo(doc, video);
}

// ───────────────────────── Operacje jako dane (czat AI) ─────────────────────────

export const EditOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_target_duration"), seconds: z.number().min(3).max(180) }),
  z.object({ op: z.literal("remove_clip"), itemId: z.string() }),
  z.object({ op: z.literal("trim_clip"), itemId: z.string(), sourceIn: z.number().min(0), sourceOut: z.number().min(0) }),
  z.object({ op: z.literal("move_clip"), itemId: z.string(), toIndex: z.number().int().min(0) }),
  z.object({ op: z.literal("set_speed"), itemId: z.string(), speed: z.number().min(0.25).max(4) }),
  z.object({ op: z.literal("set_transition"), itemId: z.string(), type: z.enum(["cut", "fade", "fadeblack"]), duration: z.number().min(0).max(1.5) }),
  z.object({ op: z.literal("insert_clip"), assetId: z.string(), sourceIn: z.number().min(0), sourceOut: z.number().min(0), index: z.number().int().min(0) }),
  z.object({
    op: z.literal("add_text"),
    text: z.string().min(1).max(200),
    start: z.number().min(0),
    end: z.number().min(0),
    kind: z.enum(["caption", "cta", "title"]),
  }),
  z.object({ op: z.literal("update_text"), textId: z.string(), text: z.string().min(1).max(200) }),
  z.object({ op: z.literal("remove_text"), textId: z.string() }),
  z.object({ op: z.literal("set_caption_style"), preset: z.enum(CAPTION_PRESET_KEYS) }),
  z.object({ op: z.literal("set_text_animation"), animation: z.enum(TEXT_ANIMATIONS) }),
  z.object({ op: z.literal("set_music_volume"), volume: z.number().min(0).max(2) }),
  z.object({ op: z.literal("mute_original"), muted: z.boolean() }),
]);
export type EditOp = z.infer<typeof EditOpSchema>;

/** Stosuje operację; nieprawidłowe referencje są pomijane (zwracany komunikat). */
export function applyOp(doc: TimelineDoc, op: EditOp, assets: AssetMap): { doc: TimelineDoc; error?: string } {
  const hasVideo = (id: string) => doc.video.some((v) => v.id === id);
  const hasText = (id: string) => doc.texts.some((t) => t.id === id);
  switch (op.op) {
    case "set_target_duration":
      return { doc: clampToDuration(fitToDuration(doc, op.seconds, assets, { protectFirst: true })) };
    case "remove_clip":
      if (!hasVideo(op.itemId)) return { doc, error: `Nie znaleziono klipu ${op.itemId}` };
      return { doc: clampToDuration(removeItem(doc, op.itemId)) };
    case "trim_clip":
      if (!hasVideo(op.itemId)) return { doc, error: `Nie znaleziono klipu ${op.itemId}` };
      return { doc: clampToDuration(trimItem(doc, op.itemId, { sourceIn: op.sourceIn, sourceOut: op.sourceOut }, assets)) };
    case "move_clip":
      if (!hasVideo(op.itemId)) return { doc, error: `Nie znaleziono klipu ${op.itemId}` };
      return { doc: moveItem(doc, op.itemId, op.toIndex) };
    case "set_speed":
      if (!hasVideo(op.itemId)) return { doc, error: `Nie znaleziono klipu ${op.itemId}` };
      return { doc: clampToDuration(updateVideoItem(doc, op.itemId, { speed: op.speed })) };
    case "set_transition":
      if (!hasVideo(op.itemId)) return { doc, error: `Nie znaleziono klipu ${op.itemId}` };
      return { doc: updateVideoItem(doc, op.itemId, { transition: { type: op.type, duration: op.type === "cut" ? 0 : op.duration } }) };
    case "insert_clip": {
      const a = assets[op.assetId];
      if (!a || a.kind === "AUDIO" || a.kind === "IMAGE") return { doc, error: `Nie znaleziono nagrania ${op.assetId}` };
      const sIn = clamp(op.sourceIn, 0, Math.max(0, a.durationSec - MIN_CLIP));
      const sOut = clamp(op.sourceOut, sIn + MIN_CLIP, a.durationSec);
      const video = [...doc.video];
      video.splice(clamp(op.index, 0, video.length), 0, newVideoItem(op.assetId, sIn, sOut));
      return { doc: withVideo(doc, video) };
    }
    case "add_text": {
      const total = totalDuration(doc);
      const start = clamp(op.start, 0, Math.max(0, total - 0.3));
      const end = clamp(op.end, start + 0.4, Math.max(total, start + 0.4));
      const t = makeText(op.text, start, end, { kind: op.kind, preset: doc.settings.captionPreset });
      return { doc: { ...doc, texts: [...doc.texts, t] } };
    }
    case "update_text":
      if (!hasText(op.textId)) return { doc, error: `Nie znaleziono napisu ${op.textId}` };
      return { doc: updateText(doc, op.textId, { text: op.text }) };
    case "remove_text":
      if (!hasText(op.textId)) return { doc, error: `Nie znaleziono napisu ${op.textId}` };
      return { doc: removeItem(doc, op.textId) };
    case "set_caption_style":
      return { doc: applyCaptionPreset(doc, op.preset) };
    case "set_text_animation":
      return { doc: { ...doc, texts: doc.texts.map((t) => ({ ...t, animation: t.kind === "transcript" && op.animation !== "none" ? t.animation : op.animation })) } };
    case "set_music_volume":
      if (!doc.audio.length) return { doc, error: "Projekt nie ma ścieżki muzycznej" };
      return { doc: { ...doc, audio: doc.audio.map((a) => ({ ...a, volume: op.volume })) } };
    case "mute_original":
      return { doc: { ...doc, settings: { ...doc.settings, muteOriginal: op.muted } } };
  }
}

export function applyOps(doc: TimelineDoc, ops: EditOp[], assets: AssetMap) {
  const errors: string[] = [];
  let cur = doc;
  for (const op of ops) {
    const r = applyOp(cur, op, assets);
    if (r.error) errors.push(r.error);
    cur = r.doc;
  }
  return { doc: cur, errors };
}

/** Czytelny opis operacji (podsumowanie przed „Zastosuj zmiany”). */
export function describeOp(op: EditOp, doc: TimelineDoc): string {
  const idx = (id: string) => doc.video.findIndex((v) => v.id === id) + 1;
  const txt = (id: string) => doc.texts.find((t) => t.id === id)?.text ?? id;
  switch (op.op) {
    case "set_target_duration": return `Dopasuj długość rolki do ${op.seconds.toFixed(1).replace(".", ",")} s`;
    case "remove_clip": return `Usuń klip #${idx(op.itemId)}`;
    case "trim_clip": return `Przytnij klip #${idx(op.itemId)} do ${op.sourceIn.toFixed(2)}–${op.sourceOut.toFixed(2)} s materiału`;
    case "move_clip": return `Przenieś klip #${idx(op.itemId)} na pozycję ${op.toIndex + 1}`;
    case "set_speed": return `Ustaw prędkość klipu #${idx(op.itemId)} na ${op.speed}×`;
    case "set_transition": return `Przejście przed klipem #${idx(op.itemId)}: ${op.type === "cut" ? "cięcie" : op.type === "fade" ? "przenikanie" : "przez czerń"}`;
    case "insert_clip": return `Wstaw fragment ${op.sourceIn.toFixed(1)}–${op.sourceOut.toFixed(1)} s na pozycję ${op.index + 1}`;
    case "add_text": return `Dodaj napis „${op.text}” (${op.start.toFixed(1)}–${op.end.toFixed(1)} s)`;
    case "update_text": return `Zmień napis „${txt(op.textId)}” → „${op.text}”`;
    case "remove_text": return `Usuń napis „${txt(op.textId)}”`;
    case "set_caption_style": return `Zmień styl napisów na ${CAPTION_PRESETS[op.preset].label}`;
    case "set_text_animation": return `Animacja napisów: ${op.animation}`;
    case "set_music_volume": return `Głośność muzyki: ${Math.round(op.volume * 100)}%`;
    case "mute_original": return op.muted ? "Wycisz oryginalne audio" : "Przywróć oryginalne audio";
  }
}
