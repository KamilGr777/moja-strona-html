// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { createApp } from '../server/app';
import { AiError, createAiService, toEvaluation, type AiService } from '../server/ai';
import { getTask } from '../src/content/tasks';
import type { Evaluation } from '../src/lib/scoring';

function fakeAi(overrides: Partial<AiService> = {}): AiService {
  return {
    available: true,
    model: 'test-model',
    evaluate: vi.fn(async (task: Parameters<AiService['evaluate']>[0]) => ({
      mode: 'ai',
      taskId: task.id,
      score: 50,
      criteria: task.criteria.map((c) => ({ id: c.id, level: 0.5, comment: 'ok' })),
      summary: 's',
      strengths: [],
      improvements: [],
      warnings: [],
    }) as Evaluation),
    run: vi.fn(async () => 'odpowiedź'),
    explain: vi.fn(async () => 'wyjaśnienie'),
    ...overrides,
  };
}

const post = (app: ReturnType<typeof createApp>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('Serwer API', () => {
  it('health informuje o dostępności AI bez ujawniania klucza', async () => {
    const app = createApp({ ai: fakeAi() });
    const res = await app.request('/api/health');
    expect(await res.json()).toEqual({ ok: true, ai: true, model: 'test-model' });
    const off = createApp({ ai: createAiService({}) });
    expect(await (await off.request('/api/health')).json()).toEqual({ ok: true, ai: false });
  });

  it('bez klucza API zwraca 503 (aplikacja przechodzi w tryb demonstracyjny)', async () => {
    const app = createApp({ ai: createAiService({}) });
    const res = await post(app, '/api/evaluate', { taskId: 't-komunikat-zarzadca', prompt: 'test' });
    expect(res.status).toBe(503);
  });

  it('waliduje dane wejściowe', async () => {
    const app = createApp({ ai: fakeAi() });
    expect((await post(app, '/api/evaluate', { taskId: 't-komunikat-zarzadca', prompt: '' })).status).toBe(400);
    expect((await post(app, '/api/evaluate', { taskId: 'nie-ma', prompt: 'abc' })).status).toBe(400);
    expect((await post(app, '/api/evaluate', { taskId: 't-komunikat-zarzadca', prompt: 'x'.repeat(7000) })).status).toBe(400);
    expect((await post(app, '/api/explain', { term: 'a' })).status).toBe(400);
  });

  it('zwraca ocenę modelu AI', async () => {
    const ai = fakeAi();
    const app = createApp({ ai });
    const res = await post(app, '/api/evaluate', { taskId: 't-komunikat-zarzadca', prompt: 'Napisz komunikat' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { evaluation: Evaluation };
    expect(body.evaluation.mode).toBe('ai');
    expect(ai.evaluate).toHaveBeenCalledOnce();
  });

  it('ogranicza liczbę zapytań', async () => {
    const app = createApp({ ai: fakeAi(), rateLimit: 2 });
    const send = () => post(app, '/api/explain', { term: 'prompt' }, { 'x-forwarded-for': '1.2.3.4' });
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });

  it('mapuje błędy AI na czytelne kody', async () => {
    const app = createApp({ ai: fakeAi({ run: vi.fn(async () => { throw new AiError('refusal', 'odmowa'); }) }) });
    const res = await post(app, '/api/run', { taskId: 't-komunikat-zarzadca', prompt: 'abc' });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('refusal');
  });
});

describe('Warstwa AI — walidacja ustrukturyzowanej odpowiedzi', () => {
  const task = getTask('t-komunikat-zarzadca')!;
  const output = {
    criteria: task.criteria.map((c, i) => ({ id: c.id, level: (i % 2 ? 'spelnione' : 'czesciowo') as 'spelnione' | 'czesciowo', comment: `komentarz ${c.id}` })),
    summary: 'Bardzo dobry początek.',
    strengths: ['a'],
    improvements: ['b'],
    improvedPrompt: 'Lepszy prompt',
    personalDataDetected: false,
  };

  it('wylicza wynik deterministycznie z wag rubryki', () => {
    const ev = toEvaluation(task, output, 'prompt', 'm');
    const expected = task.criteria.reduce((s, c, i) => s + c.weight * (i % 2 ? 1 : 0.5), 0);
    expect(ev.score).toBe(Math.round(expected));
    expect(ev.mode).toBe('ai');
  });

  it('odrzuca odpowiedź bez oceny wszystkich kryteriów', () => {
    expect(() => toEvaluation(task, { ...output, criteria: output.criteria.slice(1) }, 'p', 'm')).toThrow(AiError);
  });

  it('korzysta z SDK (structured outputs) i obsługuje odmowę modelu', async () => {
    const parse = vi.fn(async () => ({ stop_reason: 'end_turn', parsed_output: output, model: 'claude-opus-5-5' }));
    const client = { beta: { messages: { parse } } } as unknown as Anthropic;
    const svc = createAiService({ client });
    const ev = await svc.evaluate(task, 'Napisz komunikat');
    expect(ev.criteria).toHaveLength(task.criteria.length);
    const args = (parse.mock.calls[0] as unknown[])[0] as { model: string; messages: { content: string }[] };
    expect(args.model).toBe('claude-opus-5-5');
    expect(args.messages[0].content).toContain('<prompt_uczestnika>');

    const refusing = createAiService({ client: { beta: { messages: { parse: vi.fn(async () => ({ stop_reason: 'refusal', parsed_output: null })) } } } as unknown as Anthropic });
    await expect(refusing.evaluate(task, 'x')).rejects.toMatchObject({ code: 'refusal' });
  });
});
