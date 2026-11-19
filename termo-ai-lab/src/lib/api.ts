import type { Evaluation } from './scoring';

/**
 * Klient serwera TERMO AI LAB. Klucz API modelu AI znajduje się WYŁĄCZNIE na serwerze —
 * przeglądarka wysyła tylko treść promptu i identyfikator zadania.
 */

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');

export type ApiErrorKind = 'offline' | 'unavailable' | 'rate' | 'invalid' | 'server' | 'timeout' | 'refusal';

export class ApiError extends Error {
  kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message?: string) {
    super(message ?? API_ERROR_MESSAGES[kind]);
    this.kind = kind;
  }
}

export const API_ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  offline: 'Brak połączenia z Internetem. Funkcje korzystające z modelu AI wymagają połączenia.',
  unavailable: 'Model AI nie jest skonfigurowany na serwerze tej aplikacji.',
  rate: 'Wysłano zbyt wiele zapytań w krótkim czasie. Odczekaj kilka minut i spróbuj ponownie.',
  invalid: 'Nie udało się przetworzyć zapytania. Sprawdź treść i spróbuj ponownie.',
  server: 'Serwer AI chwilowo nie odpowiada poprawnie. Spróbuj ponownie za chwilę.',
  timeout: 'Model AI odpowiada zbyt długo. Spróbuj ponownie za chwilę.',
  refusal: 'Model AI odmówił wykonania tego polecenia. Zmień treść i spróbuj ponownie.',
};

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 60000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError('timeout');
    throw new ApiError(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unavailable');
  } finally {
    clearTimeout(timer);
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    // Np. aplikacja hostowana statycznie bez serwera API.
    throw new ApiError('unavailable');
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string; code?: ApiErrorKind }) | null;
  if (!res.ok || !body) {
    if (res.status === 429) throw new ApiError('rate');
    if (res.status === 503) throw new ApiError('unavailable');
    if (res.status === 400 || res.status === 413) throw new ApiError('invalid', body?.error);
    if (body?.code === 'refusal') throw new ApiError('refusal');
    if (res.status === 504) throw new ApiError('timeout');
    throw new ApiError('server', body?.error);
  }
  return body;
}

export interface HealthResponse {
  ok: boolean;
  ai: boolean;
  model?: string;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health', { method: 'GET', timeoutMs: 8000 });
}

function isEvaluation(v: unknown): v is Evaluation {
  if (!v || typeof v !== 'object') return false;
  const e = v as Evaluation;
  return (
    e.mode === 'ai' &&
    typeof e.score === 'number' &&
    e.score >= 0 &&
    e.score <= 100 &&
    Array.isArray(e.criteria) &&
    e.criteria.every((c) => typeof c.id === 'string' && [0, 0.5, 1].includes(c.level) && typeof c.comment === 'string') &&
    typeof e.summary === 'string' &&
    Array.isArray(e.strengths) &&
    Array.isArray(e.improvements)
  );
}

export async function evaluateWithAI(taskId: string, prompt: string): Promise<Evaluation> {
  const body = await request<{ evaluation: unknown }>('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ taskId, prompt }),
  });
  if (!isEvaluation(body.evaluation)) throw new ApiError('server', 'Odpowiedź modelu AI miała nieprawidłowy format.');
  return { ...body.evaluation, warnings: body.evaluation.warnings ?? [] };
}

export async function runPrompt(taskId: string, prompt: string, attachMaterials: boolean): Promise<{ output: string; model: string }> {
  return request<{ output: string; model: string }>('/api/run', {
    method: 'POST',
    body: JSON.stringify({ taskId, prompt, attachMaterials }),
    timeoutMs: 90000,
  });
}

export async function explainTerm(term: string): Promise<{ text: string; model: string }> {
  return request<{ text: string; model: string }>('/api/explain', {
    method: 'POST',
    body: JSON.stringify({ term }),
  });
}
