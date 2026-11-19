import { AREA_INFO, type AssessmentArea } from '../content/assessments';
import { LEVELS } from '../content/levels';
import type { LevelId } from '../content/types';
import type { Recommendation } from './store';

/**
 * Zasady oceny gotowości („Oceń moje osiągnięcia”):
 * • Wynik = średnia ważona pięciu obszarów (wagi w AREA_INFO, suma 100).
 * • Gotowość (≥ 75) wymaga braku błędów krytycznych i co najmniej 50 pkt w ocenie wiarygodności.
 *   Błąd krytyczny (np. przeoczone zmyślenie, wklejenie danych osobowych, decyzja oddana AI)
 *   blokuje rekomendację przejścia niezależnie od wysokiej średniej.
 * • 55–74 → „jesteś blisko” (dwa obszary do utrwalenia), < 55 → „kontynuuj na tym poziomie”.
 */

export const READY_THRESHOLD = 75;
export const ALMOST_THRESHOLD = 55;
export const MIN_VERIFICATION = 50;

export interface SectionResult {
  sectionId: string;
  area: AssessmentArea;
  score: number;
  criticalMiss: boolean;
  notes?: string[];
}

export interface Readiness {
  score: number;
  areas: { area: AssessmentArea; label: string; score: number }[];
  critical: boolean;
  criticalReasons: string[];
  recommendation: Recommendation;
  headline: string;
  message: string;
  strengths: AssessmentArea[];
  weaknesses: AssessmentArea[];
}

const AREA_INSTRUMENTAL: Record<AssessmentArea, string> = {
  zasady: 'zasadami pracy z AI',
  pisanie: 'tworzeniem promptów',
  poprawianie: 'doprecyzowywaniem poleceń',
  wiarygodnosc: 'sprawdzaniem wiarygodności odpowiedzi',
  praktyka: 'zadaniami praktycznymi',
};

const AREA_ACCUSATIVE: Record<AssessmentArea, string> = {
  zasady: 'zasady pracy z AI',
  pisanie: 'pisanie promptów',
  poprawianie: 'poprawianie instrukcji',
  wiarygodnosc: 'sprawdzanie wiarygodności odpowiedzi',
  praktyka: 'zadania praktyczne',
};

function joinPl(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} i ${items[items.length - 1]}`;
}

export function computeReadiness(level: LevelId, results: SectionResult[]): Readiness {
  const areaScores = new Map<AssessmentArea, number[]>();
  for (const r of results) {
    const list = areaScores.get(r.area) ?? [];
    list.push(r.score);
    areaScores.set(r.area, list);
  }
  const areas = (Object.keys(AREA_INFO) as AssessmentArea[]).map((area) => {
    const list = areaScores.get(area) ?? [0];
    return { area, label: AREA_INFO[area].label, score: Math.round(list.reduce((s, v) => s + v, 0) / list.length) };
  });
  const score = Math.round(areas.reduce((s, a) => s + (a.score * AREA_INFO[a.area].weight) / 100, 0));

  const criticalReasons: string[] = [];
  for (const r of results) {
    if (r.criticalMiss) criticalReasons.push(...(r.notes?.length ? r.notes : [`Istotny błąd w części „${AREA_INFO[r.area].label}”.`]));
  }
  const verification = areas.find((a) => a.area === 'wiarygodnosc')?.score ?? 0;
  if (verification < MIN_VERIFICATION) {
    criticalReasons.push(`Ocena wiarygodności odpowiedzi poniżej ${MIN_VERIFICATION} pkt — to kluczowa umiejętność bezpiecznej pracy z AI.`);
  }
  const critical = criticalReasons.length > 0;

  const strengths = areas.filter((a) => a.score >= 80).sort((a, b) => b.score - a.score).map((a) => a.area);
  const weaknesses = [...areas].filter((a) => a.score < 80).sort((a, b) => a.score - b.score).slice(0, 2).map((a) => a.area);
  if (critical && !weaknesses.includes('wiarygodnosc') && verification < 80) weaknesses.unshift('wiarygodnosc');

  let recommendation: Recommendation;
  if (score >= READY_THRESHOLD && !critical) recommendation = 'ready';
  else if (score >= ALMOST_THRESHOLD) recommendation = 'almost';
  else recommendation = 'practice';

  const next = LEVELS[level].next;
  let headline: string;
  if (recommendation === 'ready') {
    headline = next ? `Rekomendujemy przejście na poziom ${LEVELS[next].name.toLowerCase()}` : 'Jesteś gotowy do samodzielnej pracy z AI na poziomie zaawansowanym';
  } else if (recommendation === 'almost') {
    headline = critical && score >= READY_THRESHOLD
      ? 'Wysoki wynik — ale najpierw utrwal bezpieczną pracę z AI'
      : `Jesteś blisko kolejnego poziomu. Proponujemy utrwalić ${weaknesses.length >= 2 ? 'dwie umiejętności' : 'jedną umiejętność'}`;
  } else {
    headline = 'Warto jeszcze poćwiczyć na obecnym poziomie';
  }

  const parts: string[] = [];
  if (strengths.length) parts.push(`Bardzo dobrze radzisz sobie z ${joinPl(strengths.slice(0, 2).map((a) => AREA_INSTRUMENTAL[a]))}.`);
  if (weaknesses.length) parts.push(`Warto jeszcze poćwiczyć ${joinPl(weaknesses.slice(0, 2).map((a) => AREA_ACCUSATIVE[a]))}.`);
  if (critical) parts.push('Wystąpił istotny błąd dotyczący bezpieczeństwa lub weryfikacji wyników — dlatego rekomendacja uwzględnia go niezależnie od średniej.');

  return { score, areas, critical, criticalReasons, recommendation, headline, message: parts.join(' '), strengths, weaknesses };
}
