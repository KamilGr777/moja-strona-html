import { z } from "zod";

// Schematy odpowiedzi modelu (structured outputs). Celowo bez ograniczeń liczbowych —
// zakresy są egzekwowane po stronie serwera (clamp), co jest bezpieczniejsze niż poleganie na modelu.

export const SHOT_CATEGORY_ENUM = z.enum([
  "result", "before", "polishing", "coating", "ppf", "washing", "decon", "interior", "upholstery", "detail", "wheels", "water", "worker", "reveal", "studio", "other",
]);

const scoreItem = z.object({ score: z.number(), rationale: z.string() });

export const ReelAnalysisSchema = z.object({
  scenes: z.array(
    z.object({
      index: z.number().int(),
      description: z.string(),
      category: SHOT_CATEGORY_ENUM,
      interestScore: z.number(),
      qualityScore: z.number(),
      hookPotential: z.number(),
      visibleText: z.string().nullable(),
    }),
  ),
  scores: z.object({ hook: scoreItem, visual: scoreItem, clarity: scoreItem, pacing: scoreItem, cta: scoreItem, captions: scoreItem }),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  priorityFixes: z.array(z.string()),
  optimalLength: z.object({ seconds: z.number(), rationale: z.string() }),
  questions: z.array(
    z.object({ id: z.number().int(), question: z.string(), answer: z.string(), verdict: z.enum(["yes", "partly", "no", "unknown"]) }),
  ),
  findings: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      severity: z.enum(["GOOD", "WARN", "BAD"]),
      category: z.enum(["hook", "visual", "clarity", "pacing", "cta", "captions", "audio", "structure"]),
      shotDescription: z.string(),
      problem: z.string().nullable(),
      reason: z.string().nullable(),
      suggestion: z.string(),
      suggestedCaption: z.string().nullable(),
      newShotDuration: z.number().nullable(),
      priority: z.number().int(),
    }),
  ),
  hooks: z.array(
    z.object({
      type: z.enum(["wow", "problem", "curiosity", "premium", "educational"]),
      text: z.string(),
      shot: z.string(),
      sourceStart: z.number().nullable(),
      sourceEnd: z.number().nullable(),
      needsNewFootage: z.boolean(),
      duration: z.number(),
      textAnimation: z.enum(["fade", "pop", "slide-up", "typewriter"]),
      musicIn: z.string(),
      rationale: z.string(),
    }),
  ),
  missingShots: z.array(
    z.object({
      name: z.string(),
      what: z.string(),
      angle: z.string(),
      movement: z.string(),
      sourceLength: z.string(),
      editLength: z.string(),
      lighting: z.string(),
      placement: z.string(),
      why: z.string(),
    }),
  ),
  captions: z.array(z.object({ text: z.string(), start: z.number(), end: z.number(), kind: z.enum(["hook", "process", "result", "benefit", "cta"]) })),
  music: z.object({
    mood: z.string(),
    tempo: z.string(),
    bpmMin: z.number(),
    bpmMax: z.number(),
    start: z.string(),
    accents: z.array(z.string()),
    cutSync: z.string(),
    recommendation: z.string(),
  }),
  onScreenText: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })),
  identifiedService: z.string().nullable(),
  vehicles: z.array(z.string()),
  products: z.array(z.string()),
});
export type ReelAnalysisAi = z.infer<typeof ReelAnalysisSchema>;

export const ClipCatalogSchema = z.object({
  clips: z.array(
    z.object({
      clipNumber: z.number().int(),
      summary: z.string(),
      scenes: z.array(
        z.object({
          index: z.number().int(),
          description: z.string(),
          category: SHOT_CATEGORY_ENUM,
          interestScore: z.number(),
          qualityScore: z.number(),
          hookPotential: z.number(),
          issues: z.string().nullable(),
        }),
      ),
    }),
  ),
  captions: z.object({
    hook: z.array(z.string()),
    process: z.array(z.string()),
    result: z.array(z.string()),
    benefit: z.array(z.string()),
    cta: z.array(z.string()),
  }),
  storyNotes: z.string(),
});
export type ClipCatalogAi = z.infer<typeof ClipCatalogSchema>;

// Operacje edycji w formie dla modelu (bez ograniczeń liczbowych; walidacja EditOpSchema po stronie serwera)
const aiOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_target_duration"), seconds: z.number() }),
  z.object({ op: z.literal("remove_clip"), itemId: z.string() }),
  z.object({ op: z.literal("trim_clip"), itemId: z.string(), sourceIn: z.number(), sourceOut: z.number() }),
  z.object({ op: z.literal("move_clip"), itemId: z.string(), toIndex: z.number().int() }),
  z.object({ op: z.literal("set_speed"), itemId: z.string(), speed: z.number() }),
  z.object({ op: z.literal("set_transition"), itemId: z.string(), type: z.enum(["cut", "fade", "fadeblack"]), duration: z.number() }),
  z.object({ op: z.literal("insert_clip"), assetId: z.string(), sourceIn: z.number(), sourceOut: z.number(), index: z.number().int() }),
  z.object({ op: z.literal("add_text"), text: z.string(), start: z.number(), end: z.number(), kind: z.enum(["caption", "cta", "title"]) }),
  z.object({ op: z.literal("update_text"), textId: z.string(), text: z.string() }),
  z.object({ op: z.literal("remove_text"), textId: z.string() }),
  z.object({ op: z.literal("set_caption_style"), preset: z.enum(["minimal_premium", "bold_viral", "cinematic", "luxury", "clean_modern"]) }),
  z.object({ op: z.literal("set_text_animation"), animation: z.enum(["none", "fade", "pop", "slide-up", "typewriter", "highlight"]) }),
  z.object({ op: z.literal("set_music_volume"), volume: z.number() }),
  z.object({ op: z.literal("mute_original"), muted: z.boolean() }),
]);

export const ChatResponseSchema = z.object({
  reply: z.string(),
  operations: z.array(aiOp),
  cannotDo: z.string().nullable(),
});
export type ChatResponseAi = z.infer<typeof ChatResponseSchema>;

export const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      hook: z.string(),
      marketingGoal: z.string(),
      durationSec: z.number(),
      scenario: z.array(z.object({ from: z.number(), to: z.number(), description: z.string() })),
      shotList: z.array(z.object({ shot: z.string(), camera: z.string(), duration: z.string() })),
      captions: z.array(z.string()),
      cameraMovement: z.string(),
      music: z.string(),
      editStyle: z.string(),
      requiresNewFootage: z.boolean(),
    }),
  ),
});
export type IdeasAi = z.infer<typeof IdeasSchema>;

export const PostCopySchema = z.object({
  instagram: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  tiktok: z.string(),
});
export type PostCopyAi = z.infer<typeof PostCopySchema>;
