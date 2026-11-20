import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { probeMedia, aspectLabel } from "@/lib/media/probe";
import { detectScenes, sampleFrameStats, statsForRange, buildScenes } from "@/lib/media/video-analysis";
import { analyzeAudio } from "@/lib/media/audio";
import { createProxy, createSprite, extractFrame } from "@/lib/media/derivatives";
import { detectFileType } from "@/lib/media/validate";
import { tmpDir, makeLandscapeClip, makePortraitClip, makeClickTrack } from "./helpers/fixtures";

let dir: string;
let land: string;
let portrait: string;
let click: string;

beforeAll(() => {
  dir = tmpDir();
  land = makeLandscapeClip(dir);
  portrait = makePortraitClip(dir);
  click = makeClickTrack(dir);
});

describe("probe", () => {
  it("odczytuje metadane wideo", async () => {
    const info = await probeMedia(land);
    expect(info.hasVideo).toBe(true);
    expect(info.hasAudio).toBe(true);
    expect(info.width).toBe(1280);
    expect(info.height).toBe(720);
    expect(info.fps).toBeCloseTo(30, 0);
    expect(info.durationSec).toBeGreaterThan(7.5);
    expect(info.aspectLabel).toBe("16:9");
    const p = await probeMedia(portrait);
    expect(p.hasAudio).toBe(false);
    expect(p.aspectLabel).toBe("9:16");
  });
  it("etykiety proporcji", () => {
    expect(aspectLabel(1080, 1920)).toBe("9:16");
    expect(aspectLabel(1080, 1350)).toBe("4:5");
  });
});

describe("walidacja sygnatur plików", () => {
  it("rozpoznaje MP4/MOV/WAV i odrzuca inne", () => {
    expect(detectFileType(fs.readFileSync(land).subarray(0, 64), "a.mp4")?.kind).toBe("VIDEO");
    expect(detectFileType(fs.readFileSync(portrait).subarray(0, 64), "a.mov")?.mime).toBe("video/quicktime");
    expect(detectFileType(fs.readFileSync(click).subarray(0, 64), "a.wav")?.kind).toBe("AUDIO");
    expect(detectFileType(Buffer.from("<html><script>alert(1)</script>"), "evil.mp4")).toBeNull();
  });
});

describe("wykrywanie scen i statystyki obrazu", () => {
  it("wykrywa 3 sceny w miejscach cięć", async () => {
    const info = await probeMedia(land);
    const scenes = await detectScenes(land, info.durationSec);
    expect(scenes.length).toBe(3);
    expect(scenes[1].start).toBeCloseTo(3, 0);
    expect(scenes[2].start).toBeCloseTo(6, 0);
    expect(scenes[2].end).toBeCloseTo(info.durationSec, 1);
  });
  it("mierzy ruch i jasność — statyczna ciemna scena ma mniejszy ruch i jasność", async () => {
    const samples = await sampleFrameStats(land);
    expect(samples.length).toBeGreaterThan(25);
    const moving = statsForRange(samples, 0, 3);
    const still = statsForRange(samples, 3, 6);
    expect(still.motion).toBeLessThan(moving.motion);
    expect(still.brightness).toBeLessThan(moving.brightness);
  });
  it("łączy zbyt bliskie cięcia", () => {
    const s = buildScenes([{ t: 1, score: 0.5 }, { t: 1.1, score: 0.9 }, { t: 3, score: 0.4 }], 5);
    expect(s.map((x) => x.start)).toEqual([0, 1.1, 3]);
  });
});

describe("analiza audio", () => {
  it("wykrywa tempo 120 BPM ścieżki kliknięć", async () => {
    const a = await analyzeAudio(click);
    expect(a.tempo.bpm).not.toBeNull();
    expect(Math.abs((a.tempo.bpm ?? 0) - 120)).toBeLessThan(3);
    expect(a.tempo.beats.length).toBeGreaterThan(15);
    // beaty co ~0,5 s
    const d = a.tempo.beats[5] - a.tempo.beats[4];
    expect(d).toBeGreaterThan(0.45);
    expect(d).toBeLessThan(0.55);
  });
  it("nie myli tempa z połową (impulsy 110 Hz co 0,5 s w MP3 → 120 BPM)", async () => {
    const mp3 = path.join(dir, "pulse.mp3");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "aevalsrc='0.6*sin(2*PI*110*t)*if(lt(mod(t\\,0.5)\\,0.05)\\,1\\,0.2)':s=44100:d=30", "-c:a", "libmp3lame", "-b:a", "160k", mp3]);
    const a = await analyzeAudio(mp3);
    expect(Math.abs((a.tempo.bpm ?? 0) - 120)).toBeLessThan(3);
  });
  it("mierzy głośność (LUFS)", async () => {
    const a = await analyzeAudio(land, { withTempo: false });
    expect(a.integratedLufs).not.toBeNull();
    expect(a.waveform.length).toBeGreaterThan(100);
  });
});

describe("pochodne (proxy, sprite, klatki)", () => {
  it("tworzy proxy H.264, sprite i klatkę", async () => {
    const info = await probeMedia(land);
    const proxy = path.join(dir, "proxy.mp4");
    const { width, height } = await createProxy(land, proxy, info);
    expect(height).toBe(720);
    expect(width).toBe(1280);
    const pinfo = await probeMedia(proxy);
    expect(pinfo.videoCodec).toBe("h264");
    const sprite = path.join(dir, "sprite.jpg");
    const meta = await createSprite(proxy, sprite, info);
    expect(fs.existsSync(sprite)).toBe(true);
    expect(meta.count).toBeGreaterThan(5);
    const frame = await extractFrame(proxy, path.join(dir, "f.jpg"), 1.5);
    expect(fs.statSync(frame).size).toBeGreaterThan(1000);
  });
});
