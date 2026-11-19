import type { PromptTask, SkillId } from '../content/types';

/**
 * Wspólna logika oceny promptów — używana w przeglądarce (tryb demonstracyjny)
 * i na serwerze (ocena modelem AI). Wynik zawsze wynika z rubryki:
 * suma (waga kryterium × poziom spełnienia), gdzie poziom ∈ {0, ½, 1}.
 */

export type CriterionLevel = 0 | 0.5 | 1;

export interface CriterionResult {
  id: string;
  level: CriterionLevel;
  comment: string;
}

export type EvaluationMode = 'ai' | 'demo';

export interface Evaluation {
  mode: EvaluationMode;
  taskId: string;
  score: number;
  criteria: CriterionResult[];
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Propozycja lepszej wersji przygotowana przez model AI (tylko tryb AI). */
  improvedPrompt?: string;
  warnings: string[];
  model?: string;
}

export function computeScore(task: PromptTask, results: Pick<CriterionResult, 'id' | 'level'>[]): number {
  const byId = new Map(results.map((r) => [r.id, r.level]));
  const total = task.criteria.reduce((sum, c) => sum + c.weight * (byId.get(c.id) ?? 0), 0);
  return Math.round(total);
}

export function pointsFor(task: PromptTask, criterionId: string, level: CriterionLevel): { got: number; max: number } {
  const c = task.criteria.find((x) => x.id === criterionId);
  const max = c?.weight ?? 0;
  return { got: Math.round(max * level * 10) / 10, max };
}

export interface ScoreBand {
  label: string;
  tone: 'excellent' | 'good' | 'fair' | 'weak';
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return { label: 'Świetna instrukcja', tone: 'excellent' };
  if (score >= 70) return { label: 'Bardzo dobry początek', tone: 'good' };
  if (score >= 50) return { label: 'Dobry kierunek', tone: 'fair' };
  if (score >= 30) return { label: 'Pierwszy szkic', tone: 'weak' };
  return { label: 'Polecenie wymaga rozbudowy', tone: 'weak' };
}

function joinPl(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} i ${items[items.length - 1]}`;
}

/** Krótkie, zrozumiałe podsumowanie oparte na kryteriach — np. „AI nie zna jeszcze odbiorcy…”. */
export function buildSummary(task: PromptTask, results: Pick<CriterionResult, 'id' | 'level'>[], score: number): string {
  const band = scoreBand(score);
  const levelOf = (id: string) => results.find((r) => r.id === id)?.level ?? 0;
  const missing = task.criteria
    .filter((c) => levelOf(c.id) < 1)
    .sort((a, b) => b.weight * (1 - levelOf(b.id)) - a.weight * (1 - levelOf(a.id)));

  if (missing.length === 0) {
    return `${band.label}. Polecenie zawiera wszystko, czego AI potrzebuje w tym zadaniu.`;
  }
  const goalCriterion = task.criteria.find((c) => c.skill === 'cel' || c.skill === 'struktura');
  const goalOk = goalCriterion ? levelOf(goalCriterion.id) === 1 : true;
  const top = missing.slice(0, 2).map((c) => c.missingPhrase);
  const opening = goalOk ? 'AI rozumie, co chcesz osiągnąć, ale nie zna jeszcze' : 'AI może nie zrozumieć dokładnie, co ma przygotować — brakuje';
  return `${band.label}. ${opening} ${joinPl(top)}.`;
}

/** Wyniki umiejętności (0–100) wynikające z kryteriów oceny. */
export function skillScoresFromCriteria(task: PromptTask, results: Pick<CriterionResult, 'id' | 'level'>[]): Partial<Record<SkillId, number>> {
  const acc: Partial<Record<SkillId, { sum: number; w: number }>> = {};
  for (const c of task.criteria) {
    const level = results.find((r) => r.id === c.id)?.level ?? 0;
    const cur = acc[c.skill] ?? { sum: 0, w: 0 };
    cur.sum += level * c.weight;
    cur.w += c.weight;
    acc[c.skill] = cur;
  }
  const out: Partial<Record<SkillId, number>> = {};
  for (const [skill, v] of Object.entries(acc) as [SkillId, { sum: number; w: number }][]) {
    out[skill] = Math.round((v.sum / v.w) * 100);
  }
  return out;
}

export const LEVEL_LABEL: Record<CriterionLevel, string> = {
  0: 'Brak',
  0.5: 'Częściowo',
  1: 'Spełnione',
};
