import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ff = (args: string[]) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

export function tmpDir(prefix = "drai-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Klip 1280×720 (poziomy) z 3 scenami i dźwiękiem: ruch → statyczny ciemny → ruch. */
export function makeLandscapeClip(dir: string, name = "landscape.mp4") {
  const out = path.join(dir, name);
  ff([
    "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=3",
    "-f", "lavfi", "-i", "color=c=0x101010:size=1280x720:rate=30:duration=3",
    "-f", "lavfi", "-i", "mandelbrot=size=1280x720:rate=30",
    "-f", "lavfi", "-i", "sine=frequency=330:duration=8:sample_rate=48000",
    "-filter_complex", "[2:v]trim=duration=2,setpts=PTS-STARTPTS[m];[0:v][1:v][m]concat=n=3:v=1:a=0[v]",
    "-map", "[v]", "-map", "3:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", out,
  ]);
  return out;
}

/** Klip pionowy 720×1280 bez ścieżki audio. */
export function makePortraitClip(dir: string, name = "portrait.mov") {
  const out = path.join(dir, name);
  ff(["-f", "lavfi", "-i", "testsrc=size=720x1280:rate=25:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", out]);
  return out;
}

/** Ścieżka "muzyczna" z kliknięciami co 0,5 s (120 BPM). */
export function makeClickTrack(dir: string, bpm = 120, seconds = 12) {
  const out = path.join(dir, `click${bpm}.wav`);
  const period = 60 / bpm;
  ff(["-f", "lavfi", "-i", `aevalsrc='if(lt(mod(t\\,${period})\\,0.03)\\,0.8*sin(2*PI*900*t)\\,0.02*sin(2*PI*110*t))':s=44100:d=${seconds}`, out]);
  return out;
}

export function makeLogo(dir: string) {
  const out = path.join(dir, "logo.png");
  ff(["-f", "lavfi", "-i", "color=c=0xD4AF37:size=400x160:duration=1", "-frames:v", "1", out]);
  return out;
}
