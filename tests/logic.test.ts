import { describe, it, expect } from "vitest";
import { emptyDoc, TimelineDocSchema, type AssetMap } from "@/lib/timeline/types";
import { newVideoItem, makeText, splitAt, moveItem, trimItem, fitToDuration, totalDuration, applyOps, removeItem, layoutVideo, snapCutsToBeats, duplicateItem } from "@/lib/timeline/ops";
import { planMontage, type CandidateScene } from "@/lib/montage/planner";
import { fixReel } from "@/lib/montage/fix-reel";
import { runHeuristics, sceneInterest } from "@/lib/analysis/heuristics";
import { statsForRange } from "@/lib/media/video-analysis";
import { isInSafeZone } from "@/lib/timeline/subtitles";
import { samples } from "./helpers/synthetic";

const assets: AssetMap = {
  a: { id: "a", durationSec: 10, hasAudio: true, width: 1080, height: 1920, kind: "VIDEO" },
  b: { id: "b", durationSec: 8, hasAudio: false, width: 1920, height: 1080, kind: "VIDEO" },
  m: { id: "m", durationSec: 60, hasAudio: true, width: null, height: null, kind: "AUDIO" },
};

describe("operacje timeline", () => {
  it("split, move, trim, duplicate, remove z napisami przypiętymi do klipów", () => {
    let doc = emptyDoc();
    doc.video = [newVideoItem("a", 0, 4), newVideoItem("b", 1, 3)];
    const anchored = makeText("Efekt", 4.1, 5.5, { anchor: { itemId: doc.video[1].id, offset: 0.1 } });
    doc.texts = [anchored];
    expect(totalDuration(doc)).toBeCloseTo(6);
    doc = splitAt(doc, 2);
    expect(doc.video).toHaveLength(3);
    expect(doc.video[0].sourceOut).toBeCloseTo(2);
    expect(doc.video[1].sourceIn).toBeCloseTo(2);
    // przeniesienie klipu "b" na początek → napis jedzie za klipem
    doc = moveItem(doc, doc.video[2].id, 0);
    expect(doc.texts[0].start).toBeCloseTo(0.1);
    doc = trimItem(doc, doc.video[0].id, { sourceIn: -5, sourceOut: 99 }, assets);
    expect(doc.video[0].sourceIn).toBe(0);
    expect(doc.video[0].sourceOut).toBe(8);
    doc = duplicateItem(doc, doc.video[1].id);
    expect(doc.video).toHaveLength(4);
    doc = removeItem(doc, doc.video[0].id);
    expect(doc.texts[0].anchor).toBeUndefined();
    expect(() => TimelineDocSchema.parse(doc)).not.toThrow();
  });

  it("dopasowuje długość do celu (skracanie i wydłużanie)", () => {
    let doc = emptyDoc();
    doc.video = [newVideoItem("a", 0, 5), newVideoItem("a", 5, 9), newVideoItem("b", 0, 3)];
    doc = fitToDuration(doc, 6, assets);
    expect(totalDuration(doc)).toBeCloseTo(6, 1);
    doc = fitToDuration(doc, 9, assets);
    expect(totalDuration(doc)).toBeCloseTo(9, 1);
  });

  it("stosuje operacje czatu AI i raportuje błędne referencje", () => {
    const doc = emptyDoc();
    doc.video = [newVideoItem("a", 0, 3), newVideoItem("b", 0, 3)];
    const { doc: out, errors } = applyOps(
      doc,
      [
        { op: "move_clip", itemId: doc.video[1].id, toIndex: 0 },
        { op: "add_text", text: "Umów termin", start: 4, end: 6, kind: "cta" },
        { op: "set_caption_style", preset: "bold_viral" },
        { op: "remove_clip", itemId: "nie-istnieje" },
      ],
      assets,
    );
    expect(out.video[0].assetId).toBe("b");
    expect(out.texts[0].style.fontFamily).toBe("Anton");
    expect(errors).toHaveLength(1);
  });

  it("przyciąga cięcia do beatów", () => {
    let doc = emptyDoc();
    doc.video = [newVideoItem("a", 0, 1.9), newVideoItem("a", 3, 5)];
    doc.audio = [{ id: "mu", assetId: "m", start: 0, sourceIn: 0, sourceOut: 10, volume: 1, fadeIn: 0, fadeOut: 0 }];
    doc = snapCutsToBeats(doc, [0.5, 1, 1.5, 2, 2.5], assets);
    expect(layoutVideo(doc).entries[0].end).toBeCloseTo(2, 2);
  });

  it("sprawdza bezpieczne strefy napisów", () => {
    const ok = makeText("Krótki napis", 0, 2, { y: 0.7 });
    const bad = makeText("Napis za nisko", 0, 2, { y: 0.95 });
    expect(isInSafeZone(ok, "instagram")).toBe(true);
    expect(isInSafeZone(bad, "instagram")).toBe(false);
  });
});

function scenesFor(assetId: string, name: string, order: number, cats: Array<CandidateScene["category"]>, len = 3): CandidateScene[] {
  return cats.map((c, i) => ({
    assetId, assetName: name, sceneIndex: i, start: i * len, end: (i + 1) * len, category: c,
    interest: c === "result" ? 8 : 6, quality: 7, hookPotential: c === "result" ? 9 : c === "water" ? 8 : 4, motion: 0.3, sharpness: 0.8, brightness: 0.5, clipOrder: order,
  }));
}

describe("planer auto montażu", () => {
  const sc = [
    ...scenesFor("p1", "polerowanie.mp4", 0, ["polishing", "polishing", "worker"]),
    ...scenesFor("w1", "woda.mp4", 1, ["water", "detail"]),
    ...scenesFor("r1", "auto.mp4", 2, ["result", "reveal", "result"]),
    ...scenesFor("b1", "przed.mp4", 3, ["before", "before"]),
  ];
  const assetMap: AssetMap = {
    p1: { id: "p1", durationSec: 9, hasAudio: true, width: 1080, height: 1920 },
    w1: { id: "w1", durationSec: 6, hasAudio: true, width: 1920, height: 1080 },
    r1: { id: "r1", durationSec: 9, hasAudio: true, width: 1080, height: 1920 },
    b1: { id: "b1", durationSec: 6, hasAudio: true, width: 1080, height: 1920 },
    mus: { id: "mus", durationSec: 60, hasAudio: true, width: null, height: null },
  };
  const smp = Object.fromEntries(["p1", "w1", "r1", "b1"].map((id) => [id, samples(10, (t) => ({ motion: 0.2 + 0.1 * Math.sin(t), sharp: 0.85 }))]));

  for (const style of ["viral", "premium", "sales", "minimal", "before_after", "educational"] as const) {
    it(`styl ${style}: długość w celu, hook z efektu, CTA na końcu`, () => {
      const r = planMontage({
        scenes: sc, samples: smp, assets: assetMap, style, targetDuration: 18, pace: "dynamic", service: "correction", platform: "instagram",
        withCaptions: true, client: { defaultCta: "Umów konsultację", logoAssetId: null },
        music: { assetId: "mus", durationSec: 60, beats: Array.from({ length: 100 }, (_, i) => i * 0.5), energyRises: [8], bpm: 120 },
      });
      expect(() => TimelineDocSchema.parse(r.doc)).not.toThrow();
      expect(r.stats.durationSec).toBeGreaterThan(15);
      expect(r.stats.durationSec).toBeLessThan(21);
      expect(r.doc.texts.at(-1)?.text).toBe("Umów konsultację");
      expect(r.doc.audio).toHaveLength(1);
      if (style !== "sales" && style !== "before_after") expect(["result", "water", "reveal", "detail"]).toContain(sc.find((s) => s.assetId === r.doc.video[0].assetId && r.doc.video[0].sourceIn >= s.start && r.doc.video[0].sourceIn < s.end)?.category);
      // brak powtórzeń tych samych zakresów
      const ranges = r.doc.video.map((v) => `${v.assetId}:${v.sourceIn.toFixed(2)}`);
      expect(new Set(ranges).size).toBe(ranges.length);
      expect(r.changelog.length).toBeGreaterThan(2);
    });
  }

  it("działa bez kategorii (tryb heurystyczny)", () => {
    const noCat = sc.map((s) => ({ ...s, category: null }));
    const r = planMontage({ scenes: noCat, samples: smp, assets: assetMap, style: "premium", targetDuration: 15, pace: "balanced", service: "ceramic", platform: "tiktok", withCaptions: true });
    expect(r.stats.durationSec).toBeGreaterThan(12);
    expect(r.doc.texts.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Popraw rolkę", () => {
  it("przenosi najmocniejsze ujęcie na początek, skraca długie i dodaje CTA", () => {
    const scenes = [
      { index: 0, start: 0, end: 5, interest: 2, hookPotential: 2, quality: 6, sharpness: 0.8, brightness: 0.5, motion: 0.03, category: "studio", description: "Przygotowanie stanowiska" },
      { index: 1, start: 5, end: 11, interest: 6, hookPotential: 5, quality: 7, sharpness: 0.8, brightness: 0.5, motion: 0.3, category: "coating", description: "Nakładanie powłoki" },
      { index: 2, start: 11, end: 15, interest: 9, hookPotential: 9, quality: 8, sharpness: 0.9, brightness: 0.6, motion: 0.25, category: "result", description: "Gotowy samochód" },
    ];
    const r = fixReel({
      assetId: "a", durationSec: 15, hasAudio: true, speechWords: 0, scenes,
      findings: [{ start: 0, end: 4, severity: "BAD", category: "hook", suggestedCaption: null }],
      samples: samples(15, (t) => ({ motion: t < 5 ? 0.02 : 0.3 })),
      assets: { a: { id: "a", durationSec: 15, hasAudio: true, width: 1080, height: 1920 } },
      targetDuration: 12, addCaptions: true, mode: "full", service: "ceramic", platform: "instagram", preset: "luxury",
      client: { defaultCta: "Umów konsultację" },
    });
    expect(r.doc.video[0].sourceIn).toBeGreaterThanOrEqual(11);
    expect(r.comparison.after.durationSec).toBeLessThanOrEqual(12.2);
    expect(r.doc.texts.at(-1)?.text).toBe("Umów konsultację");
    expect(r.doc.audio[0]?.assetId).toBe("a");
    expect(r.changes.some((c) => c.startsWith("Nowy początek"))).toBe(true);
  });
});

describe("heurystyki", () => {
  it("wykrywa spokojny początek i długie ujęcie, liczy wynik bez kategorii AI", () => {
    const smp = samples(16, (t) => ({ motion: t < 6 ? 0.01 : 0.35, sharp: 0.8, bright: 0.5 }));
    const scenes = [
      { index: 0, start: 0, end: 6, ...statsForRange(smp, 0, 6) },
      { index: 1, start: 6, end: 8, ...statsForRange(smp, 6, 8) },
      { index: 2, start: 8, end: 16, ...statsForRange(smp, 8, 16) },
    ].map((s) => ({ ...s, interest: sceneInterest(s) }));
    const r = runHeuristics({
      info: { durationSec: 16, width: 1080, height: 1920, fps: 30, hasAudio: false, aspectLabel: "9:16" },
      scenes, samples: smp, audio: null, transcript: null, platform: "instagram", goal: "leads",
    });
    expect(r.findings.some((f) => f.category === "hook" && f.severity === "BAD")).toBe(true);
    expect(r.findings.some((f) => f.category === "pacing" && f.start === 8)).toBe(true);
    expect(r.totalScaled).toBe(true);
    expect(r.categories.find((c) => c.key === "clarity")?.score).toBeNull();
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.retention.points[0].value).toBeLessThanOrEqual(100);
    expect(r.retention.points.at(-1)!.value).toBeLessThan(r.retention.points[0].value);
    expect(r.retention.segments.length).toBeGreaterThan(0);
  });
});

import { mapSourceRange, transcriptToTexts } from "@/lib/timeline/mapping";
describe("mapowanie źródło → timeline", () => {
  it("mapuje uwagi i słowa transkrypcji na pozycje klipów", () => {
    const doc = emptyDoc();
    doc.video = [newVideoItem("a", 5, 8), newVideoItem("a", 0, 2, { speed: 2 })];
    expect(mapSourceRange(doc, "a", 6, 7)[0]).toMatchObject({ start: 1, end: 2 });
    expect(mapSourceRange(doc, "a", 1, 3)[0]).toMatchObject({ start: 3.5, end: 4 });
    const texts = transcriptToTexts(doc, "a", [{ start: 5, end: 7, text: "Ten lakier ma głębię.", words: [{ text: "Ten", start: 5.1, end: 5.3 }, { text: "lakier", start: 5.4, end: 5.8 }, { text: "ma", start: 5.9, end: 6 }, { text: "głębię.", start: 6.1, end: 6.6 }] }]);
    expect(texts).toHaveLength(1);
    expect(texts[0].words?.[1].start).toBeCloseTo(0.4);
    expect(texts[0].animation).toBe("highlight");
  });
});
