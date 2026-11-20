import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "../env";

let client: Anthropic | null = null;

export class AiUnavailableError extends Error {
  constructor() {
    super("Analiza AI nie jest skonfigurowana (brak ANTHROPIC_API_KEY).");
  }
}

export class AiResponseError extends Error {}

export function anthropic(): Anthropic {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) throw new AiUnavailableError();
  if (!client) client = new Anthropic({ apiKey: key, maxRetries: 3 });
  return client;
}

export type AiContent = Anthropic.Beta.BetaContentBlockParam[];

export interface StructuredCallOptions<S extends z.ZodType> {
  schema: S;
  system: string;
  content: AiContent | string;
  effort?: "low" | "medium" | "high" | "xhigh";
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: { input: number; output: number };
}

/**
 * Jedno wywołanie Claude z odpowiedzią w formacie JSON (structured outputs),
 * walidowaną schematem Zod. Strumieniowanie chroni przed timeoutami przy dużych odpowiedziach.
 * Włączony jest serwerowy fallback modelu (`fallbacks: "default"`) na wypadek odmowy klasyfikatora.
 */
export async function callStructured<S extends z.ZodType>(opts: StructuredCallOptions<S>): Promise<StructuredResult<z.infer<S>>> {
  const model = env().ANTHROPIC_MODEL;
  const stream = anthropic().beta.messages.stream(
    {
      model,
      max_tokens: opts.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort ?? "high", format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
    },
    { signal: opts.signal },
  );
  const msg = await stream.finalMessage();

  if (msg.stop_reason === "refusal") {
    throw new AiResponseError("Model odmówił wykonania analizy dla tego materiału. Spróbuj ponownie lub skorzystaj z analizy technicznej.");
  }
  if (msg.stop_reason === "max_tokens") {
    throw new AiResponseError("Odpowiedź modelu została ucięta (limit tokenów). Spróbuj ponownie.");
  }
  const text = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiResponseError("Model zwrócił nieprawidłowy JSON.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    throw new AiResponseError(`Odpowiedź modelu nie pasuje do schematu: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return {
    data: parsed.data,
    model: msg.model,
    usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
  };
}

/** Obraz JPEG jako blok treści dla modelu. */
export function imageBlock(jpeg: Buffer): Anthropic.Beta.BetaContentBlockParam {
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } };
}

export function textBlock(text: string): Anthropic.Beta.BetaContentBlockParam {
  return { type: "text", text };
}

/** Tłumaczenie błędów SDK na komunikaty dla użytkownika. */
export function describeAiError(err: unknown): string {
  if (err instanceof AiUnavailableError || err instanceof AiResponseError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return "Nieprawidłowy klucz API Anthropic (ANTHROPIC_API_KEY).";
  if (err instanceof Anthropic.RateLimitError) return "Przekroczono limit zapytań do API AI. Spróbuj za chwilę.";
  if (err instanceof Anthropic.BadRequestError) return `API AI odrzuciło zapytanie: ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return "Brak połączenia z API AI.";
  if (err instanceof Anthropic.APIError) return `Błąd API AI (${err.status}): ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
