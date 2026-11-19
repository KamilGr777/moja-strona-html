import type { LevelId, SkillId } from '../content/types';
import { LEVELS, SKILLS } from '../content/levels';
import { DRILL_TASKS, LAB_TASKS } from '../content/tasks';
import { lessonsForLevel } from '../content/lessons';
import type { ProgressState } from './store';

/**
 * Inteligentne dopasowanie nauki — proste, jawne reguły:
 * 1) Ta sama umiejętność słabo wypada w co najmniej 2 z 3 ostatnich prób → ćwiczenie celowane.
 * 2) Średnia z 3 ostatnich prób ≥ 85 → propozycja trudniejszego zadania.
 * Rekomendacja pojawia się dopiero po co najmniej 3 próbach i jest sugestią, nie diagnozą.
 */

export const MIN_ATTEMPTS_FOR_TIPS = 3;

export interface AdaptiveTip {
  kind: 'drill' | 'challenge' | 'collect';
  title: string;
  text: string;
  route?: string;
  cta?: string;
  skill?: SkillId;
}

const SKILL_VERB: Partial<Record<SkillId, string>> = {
  cel: 'określać cel polecenia',
  kontekst: 'opisywać kontekst',
  dane: 'przekazywać AI potrzebne dane',
  format: 'opisywać oczekiwany wynik',
  weryfikacja: 'wymagać sprawdzalnych odpowiedzi',
  bezpieczenstwo: 'chronić dane osobowe',
};

const SKILL_GENITIVE: Partial<Record<SkillId, string>> = {
  cel: 'określaniem celu promptu',
  kontekst: 'opisywaniem kontekstu',
  dane: 'przekazywaniem danych',
  format: 'opisywaniem oczekiwanego wyniku',
  ograniczenia: 'określaniem ograniczeń i stylu',
  weryfikacja: 'wymaganiem sprawdzalnych odpowiedzi',
  bezpieczenstwo: 'ochroną danych',
  iteracja: 'prowadzeniem rozmowy z AI',
  struktura: 'budowaniem złożonych instrukcji',
};

interface SkillStat {
  skill: SkillId;
  appearances: number;
  misses: number;
  avg: number;
}

/** Statystyki umiejętności z ostatnich 3 prób, w których dana umiejętność była oceniana. */
export function recentSkillStats(state: Pick<ProgressState, 'trainerAttempts'>): SkillStat[] {
  const stats: SkillStat[] = [];
  const skills = Object.keys(SKILLS) as SkillId[];
  for (const skill of skills) {
    const relevant = state.trainerAttempts.filter((a) => a.criteria.some((c) => c.skill === skill)).slice(-3);
    if (relevant.length === 0) continue;
    const perAttempt = relevant.map((a) => {
      const cs = a.criteria.filter((c) => c.skill === skill);
      return cs.reduce((s, c) => s + c.level, 0) / cs.length;
    });
    stats.push({
      skill,
      appearances: relevant.length,
      misses: perAttempt.filter((v) => v < 0.5).length,
      avg: perAttempt.reduce((s, v) => s + v, 0) / perAttempt.length,
    });
  }
  return stats;
}

export function getAdaptiveTip(state: Pick<ProgressState, 'trainerAttempts' | 'level'>): AdaptiveTip | null {
  const attempts = state.trainerAttempts;
  if (attempts.length < MIN_ATTEMPTS_FOR_TIPS) {
    return {
      kind: 'collect',
      title: 'Podpowiedzi dopasowane do Ciebie',
      text: `Wykonaj jeszcze ${MIN_ATTEMPTS_FOR_TIPS - attempts.length} ${MIN_ATTEMPTS_FOR_TIPS - attempts.length === 1 ? 'ćwiczenie' : 'ćwiczenia'} w trenażerze promptów, a zaproponuję, co warto poćwiczyć.`,
    };
  }

  const stats = recentSkillStats(state);
  const weak = stats
    .filter((s) => s.misses >= 2 && DRILL_TASKS.some((d) => d.focusSkill === s.skill))
    .sort((a, b) => b.misses - a.misses || a.avg - b.avg)[0];

  if (weak) {
    const drill = DRILL_TASKS.find((d) => d.focusSkill === weak.skill)!;
    const strong = stats.filter((s) => s.avg >= 0.8 && s.skill !== weak.skill).sort((a, b) => b.avg - a.avg)[0];
    const opening = strong ? `Świetnie radzisz sobie z ${SKILL_GENITIVE[strong.skill]}. ` : '';
    return {
      kind: 'drill',
      skill: weak.skill,
      title: 'Krótkie ćwiczenie dla Ciebie',
      text: `${opening}Spróbujmy teraz lepiej ${SKILL_VERB[weak.skill]} — w ostatnich próbach tego elementu najczęściej brakowało.`,
      route: `#/laboratorium/${drill.id}`,
      cta: drill.title.replace('Ćwiczenie celowane: ', 'Ćwiczenie: '),
    };
  }

  const last3 = attempts.slice(-3);
  const avg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
  if (avg >= 85) {
    const level: LevelId = state.level ?? 'poczatkujacy';
    const order: LevelId[] = ['poczatkujacy', 'sredni', 'zaawansowany'];
    const harderLevels = order.slice(order.indexOf(level));
    const tried = new Set(attempts.map((a) => a.taskId));
    const candidate =
      harderLevels.slice(1).flatMap((l) => LAB_TASKS.filter((t) => t.level === l && !tried.has(t.id)))[0] ??
      LAB_TASKS.filter((t) => t.level === level && !tried.has(t.id))[0];
    if (candidate) {
      return {
        kind: 'challenge',
        title: 'Gotowy na trudniejsze zadanie?',
        text: `Twoje ostatnie prompty są bardzo dobre (średnio ${Math.round(avg)}/100). Spróbuj zadania z poziomu „${LEVELS[candidate.level].name}”.`,
        route: `#/laboratorium/${candidate.id}`,
        cta: candidate.title,
      };
    }
  }
  return null;
}

/** Rekomendacja kolejnej lekcji na ekranie głównym. */
export function nextLessonFor(state: Pick<ProgressState, 'lessons' | 'lastLessonId'>, level: LevelId) {
  const list = lessonsForLevel(level);
  const last = state.lastLessonId ? list.find((l) => l.id === state.lastLessonId) : undefined;
  if (last && !state.lessons[last.id]?.completed && (state.lessons[last.id]?.stepIndex ?? 0) > 0) {
    return { lesson: last, resume: true };
  }
  const next = list.find((l) => !state.lessons[l.id]?.completed);
  return next ? { lesson: next, resume: (state.lessons[next.id]?.stepIndex ?? 0) > 0 } : null;
}
