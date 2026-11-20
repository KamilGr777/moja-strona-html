import { PLATFORMS, CTA_KEYWORDS_RE } from "./checklist-consts";
import { isInSafeZone } from "./subtitles";
import { totalDuration } from "./ops";
import type { TimelineDoc } from "./types";

export type CheckStatus = "ok" | "warn" | "fail";
export interface CheckItem {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface OutputInfo {
  width: number | null;
  height: number | null;
  fps: number | null;
  durationSec: number;
  videoCodec: string | null;
  audioCodec: string | null;
  bitrate: number | null;
  integratedLufs: number | null;
  truePeakDb: number | null;
}

/** Checklista przed publikacją — automatyczne sprawdzenia projektu i wyrenderowanego pliku. */
export function prePublishChecklist(doc: TimelineDoc, out: OutputInfo | null, opts: { burnSubtitles: boolean; withLogo: boolean }): CheckItem[] {
  const items: CheckItem[] = [];
  const p = PLATFORMS[doc.settings.platform];
  const dur = out?.durationSec ?? totalDuration(doc);

  // Proporcje
  if (out?.width && out.height) {
    const ok = Math.abs(out.width / out.height - 9 / 16) < 0.01;
    items.push({ key: "aspect", label: "Proporcje 9:16", status: ok ? "ok" : "fail", detail: `${out.width}×${out.height}${ok ? "" : " — wymagany format pionowy 9:16"}` });
    items.push({ key: "resolution", label: "Rozdzielczość", status: out.height >= 1920 ? "ok" : out.height >= 1280 ? "warn" : "fail", detail: out.height >= 1920 ? "1080×1920 (Full HD)" : `${out.width}×${out.height} — zalecane 1080×1920` });
  }

  // Długość
  const [lo, hi] = p.recommended;
  items.push({
    key: "duration",
    label: "Długość",
    status: dur > p.maxDuration ? "fail" : dur < lo - 3 || dur > hi + 15 ? "warn" : "ok",
    detail: `${dur.toFixed(1).replace(".", ",")} s (zalecane dla reklamy na ${p.label}: ${lo}–${hi} s)`,
  });

  // Napisy: czytelność i strefy
  const texts = doc.texts;
  if (!texts.length) {
    items.push({ key: "captions", label: "Napisy", status: "warn", detail: "Brak napisów — wiele osób ogląda rolki bez dźwięku." });
  } else {
    const small = texts.filter((t) => t.style.fontSize < 42);
    items.push({ key: "readability", label: "Czytelność napisów", status: small.length ? "warn" : "ok", detail: small.length ? `${small.length} napis(y) mniejsze niż 42 px — mogą być nieczytelne na telefonie.` : "Wielkość napisów odpowiednia na ekran telefonu." });
    const outside = texts.filter((t) => !isInSafeZone(t, doc.settings.platform));
    items.push({
      key: "safezone",
      label: "Bezpieczne obszary",
      status: outside.length ? "warn" : "ok",
      detail: outside.length ? `${outside.length} napis(y) mogą być zasłonięte przez interfejs ${p.label}: ${outside.map((t) => `„${t.text.slice(0, 24)}”`).join(", ")}` : "Wszystkie napisy mieszczą się w bezpiecznych strefach.",
    });
    const tooShort = texts.filter((t) => t.end - t.start < Math.max(0.8, t.text.split(/\s+/).length * 0.22));
    if (tooShort.length) items.push({ key: "caption_time", label: "Czas wyświetlania napisów", status: "warn", detail: `${tooShort.length} napis(y) wyświetlane zbyt krótko, by je przeczytać.` });
    if (!opts.burnSubtitles) items.push({ key: "burn", label: "Napisy w filmie", status: "warn", detail: "Napisy nie są wypalane w MP4 — dołącz plik SRT przy publikacji." });
  }

  // CTA
  const hasCta = texts.some((t) => t.kind === "cta" || CTA_KEYWORDS_RE.test(t.text));
  items.push({ key: "cta", label: "Obecność CTA", status: hasCta ? "ok" : "warn", detail: hasCta ? "Film zawiera wezwanie do działania." : "Brak napisu z CTA (np. „Umów termin”)." });

  // Audio
  if (out) {
    if (!out.audioCodec) items.push({ key: "audio", label: "Ścieżka audio", status: "warn", detail: "Plik nie zawiera dźwięku." });
    else if (out.integratedLufs !== null) {
      const l = out.integratedLufs;
      const st: CheckStatus = l < -20 || l > -9 ? "warn" : "ok";
      items.push({ key: "loudness", label: "Głośność audio", status: st, detail: `${l.toFixed(1)} LUFS${out.truePeakDb !== null ? `, szczyt ${out.truePeakDb.toFixed(1)} dBTP` : ""} (zalecane ok. −14 LUFS)` });
    }
    items.push({
      key: "quality",
      label: "Jakość eksportu",
      status: out.videoCodec === "h264" && (out.bitrate ?? 0) >= 4_000_000 ? "ok" : out.videoCodec === "h264" ? "warn" : "fail",
      detail: `${out.videoCodec?.toUpperCase() ?? "?"} / ${out.audioCodec?.toUpperCase() ?? "brak audio"}, ${out.bitrate ? `${(out.bitrate / 1_000_000).toFixed(1).replace(".", ",")} Mb/s` : "?"}, ${out.fps ?? "?"} kl./s`,
    });
  }

  // Logo
  if (opts.withLogo && doc.logos.length) {
    const s = PLATFORMS[doc.settings.platform].safe;
    const bad = doc.logos.filter((l) => l.position.y * 1920 < s.top || l.position.y * 1920 > 1920 - s.bottom || l.end - l.start < 1);
    items.push({ key: "logo", label: "Widoczność logo", status: bad.length ? "warn" : "ok", detail: bad.length ? "Logo może być zasłonięte przez interfejs lub wyświetlane krócej niż 1 s." : "Logo w bezpiecznej strefie." });
  } else {
    items.push({ key: "logo", label: "Widoczność logo", status: "warn", detail: "Film nie zawiera logo klienta." });
  }
  return items;
}
