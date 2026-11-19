import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { getConnInfo } from '@hono/node-server/conninfo';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAiService } from './ai';
import { createApp } from './app';

/**
 * Serwer produkcyjny TERMO AI LAB:
 *  • serwuje zbudowaną aplikację (katalog dist),
 *  • udostępnia /api/* — bezpieczną warstwę dostępu do modelu AI (klucz tylko na serwerze).
 * Uruchomienie: npm run build && npm start  (zmienne środowiskowe: patrz .env.example)
 */

function loadDotEnv() {
  const file = resolve(process.cwd(), '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const [, key, raw] = m;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^['"]|['"]$/g, '');
  }
}
loadDotEnv();

const port = Number(process.env.PORT || 8787);
const ai = createAiService({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined, model: process.env.AI_MODEL?.trim() || undefined });
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = createApp({
  ai,
  allowedOrigins,
  rateLimit: Number(process.env.AI_RATE_LIMIT || 40),
  clientKey: (c) => {
    if (process.env.TRUST_PROXY === '1') {
      const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
      if (fwd) return fwd;
    }
    try {
      return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown';
    }
  },
});

const distDir = resolve(process.cwd(), 'dist');

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!c.req.path.startsWith('/api/')) {
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    );
    const p = c.req.path;
    if (p === '/' || p.endsWith('.html') || p === '/sw.js' || p.endsWith('.webmanifest') || p.startsWith('/workbox-')) {
      c.header('Cache-Control', 'no-cache');
    } else if (p.startsWith('/assets/')) {
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
});

if (existsSync(distDir)) {
  app.use('*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
} else {
  app.get('*', (c) => c.text('Brak katalogu dist. Uruchom najpierw: npm run build', 503));
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`TERMO AI LAB działa: http://localhost:${info.port}`);
  console.log(ai.available ? `Model AI: ${ai.model} (ocena AI włączona)` : 'Brak ANTHROPIC_API_KEY — aplikacja działa w trybie demonstracyjnym.');
});
