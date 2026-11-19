/**
 * Serwer testowy: prawdziwa aplikacja (dist) + atrapa modelu AI.
 * Pozwala sprawdzić ścieżki interfejsu „z modelem AI” bez klucza API i bez kosztów.
 * Uruchomienie: npx tsx e2e/mock-ai-server.ts  (port 8790)
 */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from '../server/app';
import type { AiService } from '../server/ai';
import { computeScore, type Evaluation } from '../src/lib/scoring';
import { tempStats } from '../src/content/chartData';

const st = tempStats();

const ai: AiService = {
  available: true,
  model: 'atrapa-modelu-testowego',
  async evaluate(task, prompt) {
    const criteria = task.criteria.map((c, i) => ({ id: c.id, level: (i === 0 ? 1 : 0.5) as 0 | 0.5 | 1, comment: `Komentarz modelu (atrapa) dla: ${c.label}` }));
    const ev: Evaluation = {
      mode: 'ai',
      taskId: task.id,
      score: computeScore(task, criteria),
      criteria,
      summary: 'Bardzo dobry początek (odpowiedź atrapy modelu AI).',
      strengths: ['Jasny cel'],
      improvements: ['Dodaj więcej kontekstu'],
      improvedPrompt: `${prompt}\n\n[ulepszenie atrapy]`,
      warnings: [],
      model: 'atrapa-modelu-testowego',
    };
    return ev;
  },
  async run() {
    return `Najwyższa temperatura zasilania: ${st.maxSupply} °C. Najmniejsza ΔT: ${st.minDelta} K o 15:00. Średnia ΔT: 37,5 K.`;
  },
  async explain(term) {
    return `Wyjaśnienie atrapy dla pojęcia: ${term}`;
  },
};

const app = createApp({ ai, rateLimit: 1000 });
app.use('*', serveStatic({ root: './dist' }));
serve({ fetch: app.fetch, port: 8790 }, () => console.log('mock AI server: http://localhost:8790'));
