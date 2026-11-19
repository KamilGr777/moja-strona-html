import type { DemoCheck, PromptTask } from '../content/types';
import { buildSummary, computeScore, type CriterionLevel, type CriterionResult, type Evaluation } from './scoring';
import { detectPersonalData, normalizePl, wordCount } from './text';

/**
 * TRYB DEMONSTRACYJNY — ocena regułowa, bez modelu AI.
 * Sprawdza, czy w poleceniu pojawiają się sygnały elementów wymaganych w danym ćwiczeniu
 * (np. odbiorca, termin, forma). Nie rozumie znaczenia tekstu tak jak model językowy —
 * dlatego w interfejsie jest zawsze wyraźnie oznaczona jako ocena demonstracyjna.
 */

function matches(text: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(text);
  } catch {
    return text.includes(pattern);
  }
}

export function checkLevel(normalized: string, check: DemoCheck): CriterionLevel {
  if (check.forbidden?.some((p) => matches(normalized, p))) return 0;
  const hitGroups = check.groups.filter((group) => group.some((p) => matches(normalized, p))).length;
  const hasNumber = /\d/.test(normalized);
  const full = hitGroups >= check.full && (!check.needsNumber || hasNumber);
  if (full) return 1;
  if (hitGroups >= (check.partial ?? 1)) return 0.5;
  return 0;
}

export function evaluateDemo(task: PromptTask, prompt: string): Evaluation {
  const normalized = normalizePl(prompt);
  const words = wordCount(prompt);
  const warnings: string[] = [];

  const criteria: CriterionResult[] = task.criteria.map((c) => {
    const level = checkLevel(normalized, c.demo);
    const comment = level === 1 ? c.praise : level === 0.5 ? `Częściowo. ${c.tip}` : c.tip;
    return { id: c.id, level, comment };
  });

  if (task.brokenPrompt && normalizePl(task.brokenPrompt) === normalized) {
    warnings.push('To wciąż oryginalne, nieudane polecenie. Rozbuduj je według wskazówek.');
  }
  if (task.minWords && words > 0 && words < task.minWords) {
    warnings.push(`Polecenie ma tylko ${words} ${words === 1 ? 'słowo' : words < 5 ? 'słowa' : 'słów'}. W tym zadaniu AI potrzebuje więcej informacji.`);
  }
  const personal = detectPersonalData(prompt);
  if (personal.length > 0) {
    warnings.push(`W poleceniu wygląda na to, że jest ${personal.join(', ')}. Do narzędzi AI nie wklejaj danych osobowych — użyj znaczników, np. [ODBIORCA].`);
  }

  const score = computeScore(task, criteria);
  const strengths = task.criteria.filter((c) => criteria.find((r) => r.id === c.id)?.level === 1).map((c) => c.praise);
  const improvements = task.criteria
    .map((c) => ({ c, level: criteria.find((r) => r.id === c.id)?.level ?? 0 }))
    .filter((x) => x.level < 1)
    .sort((a, b) => b.c.weight * (1 - b.level) - a.c.weight * (1 - a.level))
    .map((x) => x.c.tip);

  return {
    mode: 'demo',
    taskId: task.id,
    score,
    criteria,
    summary: buildSummary(task, criteria, score),
    strengths,
    improvements,
    warnings,
  };
}
