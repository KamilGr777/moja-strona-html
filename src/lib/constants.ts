// Słownik domeny: cele, platformy, usługi, style. Wspólny dla UI, AI i silnika montażu.

export const GOALS = {
  leads: "Pozyskanie nowych klientów",
  service: "Prezentacja usługi",
  prestige: "Budowanie prestiżu marki",
  engagement: "Zwiększenie zaangażowania",
  before_after: "Pokazanie efektu przed i po",
  education: "Edukacja odbiorcy",
  promo: "Reklama konkretnej promocji",
} as const;
export type GoalKey = keyof typeof GOALS;

export interface PlatformSpec {
  label: string;
  /** Rekomendowany zakres długości reklamy detailingowej (s) */
  recommended: [number, number];
  maxDuration: number;
  /** Bezpieczne marginesy w px dla 1080×1920 (orientacyjne — UI platform się zmienia) */
  safe: { top: number; bottom: number; left: number; right: number };
}

export const PLATFORMS: Record<"instagram" | "tiktok" | "youtube", PlatformSpec> = {
  instagram: { label: "Instagram Reels", recommended: [12, 30], maxDuration: 180, safe: { top: 220, bottom: 420, left: 60, right: 140 } },
  tiktok: { label: "TikTok", recommended: [10, 30], maxDuration: 600, safe: { top: 160, bottom: 480, left: 60, right: 150 } },
  youtube: { label: "YouTube Shorts", recommended: [15, 40], maxDuration: 180, safe: { top: 200, bottom: 380, left: 60, right: 130 } },
};
export type PlatformKey = keyof typeof PLATFORMS;

export const SERVICES = {
  ceramic: "Powłoka ceramiczna",
  correction: "Korekta lakieru",
  ppf: "Folia PPF",
  interior: "Detailing wnętrza",
  wash: "Mycie detailingowe",
  other: "Inna",
} as const;
export type ServiceKey = keyof typeof SERVICES;

/** Kategorie ujęć rozpoznawane przez AI lub nadawane ręcznie. */
export const SHOT_CATEGORIES = {
  result: "Gotowy samochód / efekt końcowy",
  before: "Stan przed (zabrudzenia, rysy)",
  polishing: "Polerowanie / korekta",
  coating: "Aplikacja powłoki",
  ppf: "Aplikacja folii PPF",
  washing: "Mycie / piana",
  decon: "Dekontaminacja",
  interior: "Wnętrze",
  upholstery: "Pranie tapicerki",
  detail: "Zbliżenie detalu",
  wheels: "Felgi / koła",
  water: "Efekt hydrofobowy / woda",
  worker: "Detailer przy pracy",
  reveal: "Przejazd / obrót wokół auta",
  studio: "Studio / stanowisko",
  other: "Inne",
} as const;
export type ShotCategory = keyof typeof SHOT_CATEGORIES;

export const MONTAGE_STYLES = {
  viral: "Dynamiczny / TikTok",
  premium: "Premium / Cinematic",
  sales: "Reklamowy / Sprzedażowy",
  minimal: "Minimalistyczny",
  before_after: "Przed i po",
  educational: "Educational",
} as const;
export type MontageStyle = keyof typeof MONTAGE_STYLES;

export const DURATION_PRESETS = {
  "10-15": { label: "10–15 sekund", target: 13 },
  "15-20": { label: "15–20 sekund", target: 18 },
  "20-30": { label: "20–30 sekund", target: 25 },
  "30-45": { label: "30–45 sekund", target: 38 },
  custom: { label: "Własna", target: 20 },
} as const;
export type DurationPreset = keyof typeof DURATION_PRESETS;

/** Tempo → zakres długości pojedynczego ujęcia w montażu (s). */
export const PACES = {
  calm: { label: "Spokojne", shot: [2.6, 4.2] as [number, number] },
  balanced: { label: "Zrównoważone", shot: [1.6, 2.8] as [number, number] },
  dynamic: { label: "Dynamiczne", shot: [0.9, 1.8] as [number, number] },
  very_dynamic: { label: "Bardzo dynamiczne", shot: [0.45, 1.0] as [number, number] },
} as const;
export type PaceKey = keyof typeof PACES;

export const MONTAGE_GOALS = {
  views: "Wyświetlenia",
  messages: "Wiadomości od klientów",
  showcase: "Prezentacja efektu",
  brand: "Budowanie marki",
} as const;
export type MontageGoal = keyof typeof MONTAGE_GOALS;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Szkic",
  PROCESSING: "Przetwarzanie",
  ANALYZED: "Przeanalizowany",
  NEEDS_WORK: "Do poprawy",
  EDITING: "W montażu",
  RENDERED: "Wyrenderowany",
  IN_REVIEW: "U klienta",
  APPROVED: "Zaakceptowany",
  CHANGES_REQUESTED: "Poprawki klienta",
  FAILED: "Błąd",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  ANALYSIS: "Analiza rolki",
  AUTO_MONTAGE: "AI Auto Montaż",
  EDIT: "Projekt montażowy",
  IDEA: "Z pomysłu",
};

export const CATEGORY_MAX = {
  hook: 25,
  visual: 20,
  clarity: 15,
  pacing: 15,
  cta: 15,
  captions: 10,
} as const;
export type ScoreKey = keyof typeof CATEGORY_MAX;

export const CATEGORY_LABELS: Record<ScoreKey, string> = {
  hook: "Hook — pierwsze sekundy",
  visual: "Jakość i atrakcyjność ujęć",
  clarity: "Czytelność przekazu",
  pacing: "Tempo i dynamika montażu",
  cta: "Zachęta do działania (CTA)",
  captions: "Napisy i czytelność komunikacji",
};

export const ALLOWED_VIDEO_EXT = ["mp4", "mov", "webm", "m4v", "mkv", "avi"];
export const ALLOWED_AUDIO_EXT = ["mp3", "wav", "m4a", "aac", "ogg", "flac"];
export const ALLOWED_IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];
