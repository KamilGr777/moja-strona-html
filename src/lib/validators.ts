import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Kolor w formacie #RRGGBB");
const list = (max: number) => z.array(z.string().trim().min(1).max(200)).max(max).default([]);
const opt = (max = 200) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));

export const ClientSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę studia.").max(120),
  location: opt(),
  phone: opt(40),
  instagram: opt(80),
  website: z.string().trim().max(200).nullish().transform((v) => (v ? v : null)).refine((v) => !v || /^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(v), "Nieprawidłowy adres strony."),
  brandColors: z.array(hex).max(6).default([]),
  communicationStyle: opt(300),
  targetAudience: opt(300),
  services: list(15),
  advantages: list(10),
  preferredReelStyle: opt(),
  defaultCta: opt(80),
  notes: opt(2000),
});
export type ClientInput = z.infer<typeof ClientSchema>;

export const BrandTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  clientId: z.string().nullish(),
  colors: z.array(hex).max(6).default([]),
  fontFamily: z.string().max(40).nullish(),
  captionPreset: z.enum(["minimal_premium", "bold_viral", "cinematic", "luxury", "clean_modern"]).nullish(),
  captionStyle: z.record(z.string(), z.unknown()).nullish(),
  animation: z.string().max(20).nullish(),
  endCardText: z.string().max(80).nullish(),
  cta: z.string().max(80).nullish(),
  logoAssetId: z.string().nullish(),
});
