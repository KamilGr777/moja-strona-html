import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { getTask } from '../src/content/tasks';
import { AiError, type AiService } from './ai';
import { createRateLimiter } from './rateLimit';

export interface AppOptions {
  ai: AiService;
  allowedOrigins?: string[];
  rateLimit?: number;
  /** Funkcja ustalająca adres klienta (np. z gniazda sieciowego). */
  clientKey?: (c: Context) => string;
}

const EvaluateBody = z.object({ taskId: z.string().min(1).max(80), prompt: z.string().trim().min(1).max(6000) });
const RunBody = z.object({ taskId: z.string().min(1).max(80), prompt: z.string().trim().min(1).max(6000), attachMaterials: z.boolean().optional() });
const ExplainBody = z.object({ term: z.string().trim().min(2).max(120) });

const STATUS: Record<AiError['code'], 502 | 503 | 504 | 429 | 422> = {
  refusal: 422,
  invalid_output: 502,
  upstream: 502,
  timeout: 504,
  rate: 429,
};

export function createApp(opts: AppOptions) {
  const app = new Hono();
  const limiter = createRateLimiter(opts.rateLimit ?? 40, 10 * 60 * 1000);
  const keyOf = opts.clientKey ?? ((c: Context) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local');

  if (opts.allowedOrigins?.length) {
    app.use('/api/*', cors({ origin: opts.allowedOrigins, allowMethods: ['GET', 'POST'], maxAge: 600 }));
  }
  app.use('/api/*', bodyLimit({ maxSize: 32 * 1024, onError: (c) => c.json({ error: 'Zapytanie jest zbyt duże.' }, 413) }));
  app.use('/api/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  const guard = async (c: Context): Promise<Response | null> => {
    if (!opts.ai.available) return c.json({ error: 'Model AI nie jest skonfigurowany na serwerze.', code: 'unavailable' }, 503);
    if (!limiter.take(keyOf(c))) return c.json({ error: 'Zbyt wiele zapytań. Spróbuj ponownie za kilka minut.', code: 'rate' }, 429);
    return null;
  };

  const fail = (c: Context, e: unknown) => {
    if (e instanceof AiError) {
      console.warn(`[ai] ${e.code}: ${e.message}`);
      return c.json({ error: e.message, code: e.code }, STATUS[e.code]);
    }
    console.error('[ai] unexpected', e);
    return c.json({ error: 'Nieoczekiwany błąd serwera.', code: 'server' }, 500);
  };

  app.get('/api/health', (c) => c.json({ ok: true, ai: opts.ai.available, model: opts.ai.available ? opts.ai.model : undefined }));

  app.post('/api/evaluate', async (c) => {
    const parsed = EvaluateBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Nieprawidłowe dane zapytania.' }, 400);
    const task = getTask(parsed.data.taskId);
    if (!task) return c.json({ error: 'Nieznane zadanie.' }, 400);
    const blocked = await guard(c);
    if (blocked) return blocked;
    try {
      const evaluation = await opts.ai.evaluate(task, parsed.data.prompt);
      return c.json({ evaluation });
    } catch (e) {
      return fail(c, e);
    }
  });

  app.post('/api/run', async (c) => {
    const parsed = RunBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Nieprawidłowe dane zapytania.' }, 400);
    const task = getTask(parsed.data.taskId);
    if (!task) return c.json({ error: 'Nieznane zadanie.' }, 400);
    const blocked = await guard(c);
    if (blocked) return blocked;
    try {
      const output = await opts.ai.run(task, parsed.data.prompt, parsed.data.attachMaterials ?? false);
      return c.json({ output, model: opts.ai.model });
    } catch (e) {
      return fail(c, e);
    }
  });

  app.post('/api/explain', async (c) => {
    const parsed = ExplainBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Wpisz pojęcie (2–120 znaków).' }, 400);
    const blocked = await guard(c);
    if (blocked) return blocked;
    try {
      const text = await opts.ai.explain(parsed.data.term);
      return c.json({ text, model: opts.ai.model });
    } catch (e) {
      return fail(c, e);
    }
  });

  app.all('/api/*', (c) => c.json({ error: 'Nie znaleziono.' }, 404));

  return app;
}
