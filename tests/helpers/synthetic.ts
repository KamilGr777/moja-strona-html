import type { FrameSample } from "@/lib/media/video-analysis";

/** Syntetyczne próbki co 0,25 s: ruch/ostrość/jasność wg funkcji. */
export function samples(duration: number, f: (t: number) => { motion?: number; sharp?: number; bright?: number }): FrameSample[] {
  const out: FrameSample[] = [];
  for (let t = 0; t < duration; t += 0.25) {
    const v = f(t);
    out.push({
      t,
      yavg: (v.bright ?? 0.5) * 255,
      yrange: 150,
      ydif: (v.motion ?? 0.2) * 18,
      sat: 50,
      blur: 2 + (1 - (v.sharp ?? 0.8)) * 8,
    });
  }
  return out;
}
