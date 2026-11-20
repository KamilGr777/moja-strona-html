import { layoutVideo } from "./ops";
import { CAPTION_PRESETS } from "./presets";
import type { CaptionPresetKey, TextItem, TimelineDoc } from "./types";
import { round, uid } from "../utils";

/** Mapuje zakres czasu w materiale źródłowym na zakresy na osi timeline (klip może występować wielokrotnie). */
export function mapSourceRange(doc: TimelineDoc, assetId: string, start: number, end: number): Array<{ start: number; end: number; itemId: string }> {
  const { entries } = layoutVideo(doc);
  const out: Array<{ start: number; end: number; itemId: string }> = [];
  doc.video.forEach((v, i) => {
    if (v.assetId !== assetId) return;
    const s = Math.max(start, v.sourceIn);
    const e = Math.min(end, v.sourceOut);
    if (e <= s) return;
    const en = entries[i];
    out.push({ start: round(en.start + (s - v.sourceIn) / v.speed, 3), end: round(en.start + (e - v.sourceIn) / v.speed, 3), itemId: v.id });
  });
  return out;
}

/** Napisy z transkrypcji (tryb A): słowa przeniesione na oś czasu, z czasami do podświetlania. */
export function transcriptToTexts(
  doc: TimelineDoc,
  assetId: string,
  segments: Array<{ start: number; end: number; text: string; words: Array<{ text: string; start: number; end: number }> }>,
  preset: CaptionPresetKey = "bold_viral",
  maxWords = 6,
): TextItem[] {
  const p = CAPTION_PRESETS[preset];
  const mapped: Array<{ text: string; start: number; end: number; itemId: string }> = [];
  for (const seg of segments) {
    const words = seg.words.length ? seg.words : [{ text: seg.text, start: seg.start, end: seg.end }];
    for (const w of words) {
      const r = mapSourceRange(doc, assetId, w.start, Math.max(w.end, w.start + 0.05))[0];
      if (r) mapped.push({ text: w.text.trim(), start: r.start, end: r.end, itemId: r.itemId });
    }
  }
  mapped.sort((a, b) => a.start - b.start);
  const out: TextItem[] = [];
  let group: typeof mapped = [];
  const flush = () => {
    if (!group.length) return;
    out.push({
      id: uid("t"),
      kind: "transcript",
      text: group.map((g) => g.text).join(" ").slice(0, 300),
      start: group[0].start,
      end: round(Math.max(group[group.length - 1].end, group[0].start + 0.5), 3),
      style: { ...p.style, fontSize: Math.min(p.style.fontSize, 76) },
      position: { x: 0.5, y: 0.66 },
      animation: "highlight",
      words: group.map((g) => ({ text: g.text, start: g.start, end: g.end })),
    });
    group = [];
  };
  for (const w of mapped) {
    const last = group[group.length - 1];
    if (last && (w.itemId !== last.itemId || w.start - last.end > 0.6 || group.length >= maxWords || /[.!?]$/.test(last.text))) flush();
    group.push(w);
  }
  flush();
  return out;
}
