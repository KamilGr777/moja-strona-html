import { z } from "zod";

// Dokument timeline — jedno źródło prawdy dla edytora, czatu AI, auto montażu i renderu.
// Elementy wideo odnoszą się do plików źródłowych (assetId) i przedziałów czasu,
// więc render zawsze powstaje z oryginałów, bez utraty jakości.

export const FONT_FAMILIES = ["Poppins", "Montserrat", "Anton", "Bebas Neue", "Cinzel", "Playfair Display"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

export const CAPTION_PRESET_KEYS = ["minimal_premium", "bold_viral", "cinematic", "luxury", "clean_modern"] as const;
export type CaptionPresetKey = (typeof CAPTION_PRESET_KEYS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Kolor w formacie #RRGGBB");

export const CaptionStyleSchema = z.object({
  preset: z.enum(CAPTION_PRESET_KEYS),
  fontFamily: z.enum(FONT_FAMILIES),
  fontWeight: z.number().int().min(400).max(800),
  /** Wielkość w px przy szerokości kadru 1080 */
  fontSize: z.number().min(24).max(180),
  color: hex,
  highlightColor: hex,
  outlineColor: hex,
  outlineWidth: z.number().min(0).max(12),
  shadow: z.number().min(0).max(8),
  background: z.enum(["none", "box"]),
  boxColor: hex,
  boxOpacity: z.number().min(0).max(1),
  uppercase: z.boolean(),
  letterSpacing: z.number().min(0).max(20),
});
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

export const TEXT_ANIMATIONS = ["none", "fade", "pop", "slide-up", "typewriter", "highlight"] as const;
export type TextAnimation = (typeof TEXT_ANIMATIONS)[number];

export const WordSchema = z.object({ text: z.string(), start: z.number(), end: z.number() });

export const TextItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["caption", "transcript", "cta", "title"]),
  text: z.string().min(1).max(300),
  start: z.number().min(0),
  end: z.number().min(0),
  style: CaptionStyleSchema,
  /** Środek tekstu w ułamkach kadru (0..1) */
  position: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  animation: z.enum(TEXT_ANIMATIONS),
  /** Słowa z czasami (absolutny czas timeline) — podświetlanie mowy */
  words: z.array(WordSchema).optional(),
  /** Przypięcie do klipu: napis przesuwa się razem z klipem */
  anchor: z.object({ itemId: z.string(), offset: z.number() }).optional(),
});
export type TextItem = z.infer<typeof TextItemSchema>;

export const TransitionSchema = z.object({
  type: z.enum(["cut", "fade", "fadeblack"]),
  duration: z.number().min(0).max(1.5),
});
export type Transition = z.infer<typeof TransitionSchema>;

export const VideoItemSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  sourceIn: z.number().min(0),
  sourceOut: z.number().min(0),
  speed: z.number().min(0.25).max(4),
  volume: z.number().min(0).max(2),
  fadeIn: z.number().min(0).max(3),
  fadeOut: z.number().min(0).max(3),
  /** Kadrowanie do 9:16: środek kadru (0..1) i powiększenie */
  crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), zoom: z.number().min(1).max(4) }),
  /** Przejście wchodzące do tego klipu (z poprzedniego) */
  transition: TransitionSchema,
  label: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  role: z.string().max(40).optional(),
});
export type VideoItem = z.infer<typeof VideoItemSchema>;

export const AudioItemSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  /** Moment startu na timeline */
  start: z.number().min(0),
  sourceIn: z.number().min(0),
  sourceOut: z.number().min(0),
  volume: z.number().min(0).max(2),
  fadeIn: z.number().min(0).max(10),
  fadeOut: z.number().min(0).max(10),
  label: z.string().max(120).optional(),
});
export type AudioItem = z.infer<typeof AudioItemSchema>;

export const LogoItemSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  start: z.number().min(0),
  end: z.number().min(0),
  position: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  /** Szerokość logo jako ułamek szerokości kadru */
  width: z.number().min(0.05).max(0.9),
  opacity: z.number().min(0).max(1),
});
export type LogoItem = z.infer<typeof LogoItemSchema>;

export const BlurRegionSchema = z.object({
  id: z.string().min(1),
  start: z.number().min(0),
  end: z.number().min(0),
  /** Prostokąt w ułamkach kadru wyjściowego */
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.01).max(1),
  h: z.number().min(0.01).max(1),
  strength: z.number().min(2).max(40),
  label: z.string().max(60).optional(),
});
export type BlurRegion = z.infer<typeof BlurRegionSchema>;

export const TimelineSettingsSchema = z.object({
  width: z.number().int().min(270).max(2160),
  height: z.number().int().min(480).max(3840),
  fps: z.number().min(12).max(60),
  platform: z.enum(["instagram", "tiktok", "youtube"]),
  muteOriginal: z.boolean(),
  /** Wyciszanie muzyki pod mową z oryginału */
  ducking: z.boolean(),
  captionPreset: z.enum(CAPTION_PRESET_KEYS),
  targetDuration: z.number().min(3).max(180).nullable(),
});
export type TimelineSettings = z.infer<typeof TimelineSettingsSchema>;

export const TimelineDocSchema = z.object({
  version: z.literal(1),
  settings: TimelineSettingsSchema,
  video: z.array(VideoItemSchema).max(200),
  audio: z.array(AudioItemSchema).max(20),
  texts: z.array(TextItemSchema).max(300),
  logos: z.array(LogoItemSchema).max(10),
  blurs: z.array(BlurRegionSchema).max(30),
});
export type TimelineDoc = z.infer<typeof TimelineDocSchema>;

/** Minimalne informacje o plikach potrzebne do operacji na timeline. */
export interface AssetInfo {
  id: string;
  durationSec: number;
  hasAudio: boolean;
  width: number | null;
  height: number | null;
  name?: string;
  kind?: "VIDEO" | "AUDIO" | "IMAGE";
}
export type AssetMap = Record<string, AssetInfo>;

export const DEFAULT_SETTINGS: TimelineSettings = {
  width: 1080,
  height: 1920,
  fps: 30,
  platform: "instagram",
  muteOriginal: false,
  ducking: true,
  captionPreset: "minimal_premium",
  targetDuration: null,
};

export function emptyDoc(settings: Partial<TimelineSettings> = {}): TimelineDoc {
  return { version: 1, settings: { ...DEFAULT_SETTINGS, ...settings }, video: [], audio: [], texts: [], logos: [], blurs: [] };
}
