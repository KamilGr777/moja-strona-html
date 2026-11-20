import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { probeMedia } from "@/lib/media/probe";
import { ffmpeg } from "@/lib/media/ffmpeg";
import { buildRenderCommand, type RenderAsset } from "@/lib/timeline/render-graph";
import { emptyDoc, type TimelineDoc } from "@/lib/timeline/types";
import { newVideoItem, makeText, totalDuration, layoutVideo } from "@/lib/timeline/ops";
import { toAss, toSrt } from "@/lib/timeline/subtitles";
import { tmpDir, makeLandscapeClip, makePortraitClip, makeClickTrack, makeLogo } from "./helpers/fixtures";

let dir: string;
const assets: Record<string, RenderAsset> = {};

beforeAll(async () => {
  dir = tmpDir("drai-render-");
  const land = makeLandscapeClip(dir);
  const port = makePortraitClip(dir);
  const music = makeClickTrack(dir, 100, 20);
  const logo = makeLogo(dir);
  for (const [id, p] of Object.entries({ land, port, music, logo })) {
    const info = await probeMedia(p);
    assets[id] = { path: p, hasAudio: info.hasAudio, durationSec: info.durationSec || 1, width: info.width ?? 400, height: info.height ?? 160 };
  }
});

function buildDoc(): TimelineDoc {
  const doc = emptyDoc();
  doc.video = [
    newVideoItem("land", 6.1, 7.9, { crop: { x: 0.3, y: 0.5, zoom: 1.2 } }),
    newVideoItem("port", 0.5, 2.5, { speed: 1.5, transition: { type: "fade", duration: 0.4 } }),
    newVideoItem("land", 0.2, 2.6, { transition: { type: "cut", duration: 0 }, fadeOut: 0.3, volume: 0.8 }),
    newVideoItem("port", 2.5, 3.9, { speed: 0.75, transition: { type: "fadeblack", duration: 0.3 } }),
  ];
  doc.texts = [
    makeText("Ten lakier odzyskał głębię koloru", 0, 1.6, { preset: "bold_viral", animation: "pop" }),
    makeText("Precyzyjna korekta lakieru", 1.7, 3.2, { preset: "luxury", animation: "slide-up" }),
    { ...makeText("Zobacz efekt z bliska", 3.3, 5, { preset: "clean_modern", animation: "highlight" }) },
    makeText("Umów termin już dziś", 5.1, 6.4, { preset: "cinematic", kind: "cta", animation: "typewriter" }),
  ];
  doc.logos = [{ id: "lg1", assetId: "logo", start: 4, end: 7, position: { x: 0.5, y: 0.85 }, width: 0.3, opacity: 0.9 }];
  doc.blurs = [{ id: "b1", start: 0, end: 2, x: 0.3, y: 0.4, w: 0.4, h: 0.1, strength: 18 }];
  doc.audio = [{ id: "mu1", assetId: "music", start: 0.5, sourceIn: 1, sourceOut: 15, volume: 0.7, fadeIn: 0.5, fadeOut: 1 }];
  return doc;
}

describe("układ timeline", () => {
  it("liczy długość z uwzględnieniem prędkości i przejść", () => {
    const doc = buildDoc();
    const { entries, total } = layoutVideo(doc);
    // 1.8 + 2/1.5 - 0.4 + 2.4 + 1.4/0.75 - 0.3
    const expected = 1.8 + 2 / 1.5 - 0.4 + 2.4 + 1.4 / 0.75 - 0.3;
    expect(total).toBeCloseTo(expected, 3);
    expect(entries[1].start).toBeCloseTo(1.4, 3);
  });
});

describe("napisy", () => {
  it("generuje ASS i SRT", () => {
    const doc = buildDoc();
    const ass = toAss(doc);
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("Anton");
    expect(ass).toContain("\\move(");
    expect(ass).toMatch(/\\c&H[0-9A-F]{6}&/);
    const srt = toSrt(doc.texts);
    expect(srt.split("\n")[1]).toBe("00:00:00,000 --> 00:00:01,600");
    expect(srt).toContain("Umów termin");
  });
});

describe("render MP4 (FFmpeg)", () => {
  it("renderuje 1080×1920 H.264/AAC z przejściami, napisami, logo, rozmyciem i muzyką", async () => {
    const doc = buildDoc();
    const assPath = path.join(dir, "subs.ass");
    fs.writeFileSync(assPath, toAss(doc));
    const out = path.join(dir, "out.mp4");
    const cmd = buildRenderCommand(doc, assets, {
      outPath: out,
      assPath,
      fontsDir: path.resolve("public/fonts"),
      quality: "draft",
      withLogo: true,
      loudnorm: true,
    });
    let lastProgress = 0;
    await ffmpeg(cmd.args, { durationSec: cmd.durationSec, onProgress: (p) => (lastProgress = p) });
    const info = await probeMedia(out);
    expect(info.width).toBe(1080);
    expect(info.height).toBe(1920);
    expect(info.videoCodec).toBe("h264");
    expect(info.audioCodec).toBe("aac");
    expect(info.durationSec).toBeGreaterThan(totalDuration(doc) - 0.15);
    expect(info.durationSec).toBeLessThan(totalDuration(doc) + 0.15);
    expect(lastProgress).toBeGreaterThan(0.8);
  });

  it("renderuje podgląd w niższej rozdzielczości bez audio źródłowego", async () => {
    const doc = buildDoc();
    doc.settings.muteOriginal = true;
    doc.texts = [];
    const out = path.join(dir, "preview.mp4");
    const cmd = buildRenderCommand(doc, assets, { outPath: out, assPath: null, fontsDir: "public/fonts", quality: "draft", withLogo: false, loudnorm: false, width: 540, height: 960 });
    await ffmpeg(cmd.args);
    const info = await probeMedia(out);
    expect(info.width).toBe(540);
    expect(info.hasAudio).toBe(true);
  });
});
