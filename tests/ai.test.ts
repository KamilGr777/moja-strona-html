import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ReelAnalysisSchema, ClipCatalogSchema, ChatResponseSchema, IdeasSchema, PostCopySchema } from "@/lib/ai/schemas";
import { startMockAnthropic } from "./helpers/mock-anthropic";

const Small = z.object({ answer: z.string(), score: z.number() });
let mock: Awaited<ReturnType<typeof startMockAnthropic>>;
let mode: "ok" | "refusal" | "badjson" = "ok";

beforeAll(async () => {
  mock = await startMockAnthropic(() => (mode === "refusal" ? { text: "", stopReason: "refusal" } : { text: mode === "badjson" ? '{"answer": 1' : JSON.stringify({ answer: "Tak", score: 7 }) }));
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.ANTHROPIC_BASE_URL = mock.url;
});
afterAll(async () => mock.close());

describe("schematy structured outputs", () => {
  it("wszystkie schematy konwertują się do formatu JSON Schema", () => {
    for (const s of [ReelAnalysisSchema, ClipCatalogSchema, ChatResponseSchema, IdeasSchema, PostCopySchema]) {
      const f = betaZodOutputFormat(s) as unknown as { type: string; schema: Record<string, unknown> };
      expect(f.type).toBe("json_schema");
      expect(JSON.stringify(f.schema)).toContain('"additionalProperties":false');
    }
  });
});

describe("callStructured (mock Messages API)", () => {
  it("wysyła poprawne żądanie i waliduje odpowiedź", async () => {
    const { callStructured, imageBlock, textBlock } = await import("@/lib/ai/client");
    const r = await callStructured({ schema: Small, system: "Test", content: [textBlock("Klatka t=00:01.0"), imageBlock(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))], effort: "high" });
    expect(r.data).toEqual({ answer: "Tak", score: 7 });
    const call = mock.calls.at(-1)!;
    expect(String(call.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(call.body.model).toBe("claude-opus-5-5");
    expect(call.body.fallbacks).toBe("default");
    expect(call.body.thinking).toEqual({ type: "adaptive" });
    expect((call.body.output_config as { effort: string; format: { type: string } }).effort).toBe("high");
    expect((call.body.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    expect(call.body.stream).toBe(true);
    const content = (call.body.messages as Array<{ content: Array<{ type: string }> }>)[0].content;
    expect(content.map((c) => c.type)).toEqual(["text", "image"]);
  });

  it("obsługuje odmowę modelu i nieprawidłowy JSON czytelnym błędem", async () => {
    const { callStructured, AiResponseError } = await import("@/lib/ai/client");
    mode = "refusal";
    await expect(callStructured({ schema: Small, system: "x", content: "y" })).rejects.toBeInstanceOf(AiResponseError);
    mode = "badjson";
    await expect(callStructured({ schema: Small, system: "x", content: "y" })).rejects.toThrow(/JSON/);
    mode = "ok";
  });
});
