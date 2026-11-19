import { describe, expect, it } from 'vitest';
import { computeReadiness, type SectionResult } from '../src/lib/assessment';
import { getAdaptiveTip, nextLessonFor } from '../src/lib/adaptive';
import { heatLossStats, tempStats } from '../src/content/chartData';
import { LESSON_WYKRESY } from '../src/content/lessons/intermediate';
import { LESSON_TESTOWANIE } from '../src/content/lessons/advanced';
import { suggestLevel } from '../src/content/placement';
import { parseHash, toHash, type Route } from '../src/lib/router';
import type { TrainerAttempt } from '../src/lib/store';
import { pairwiseOrderScore } from '../src/components/exercises/SortExercises';
import { scoreFindError } from '../src/components/exercises/FindErrorExercise';
import { scoreRedact } from '../src/components/exercises/RedactExercise';
import { LESSON_SPRAWDZANIE } from '../src/content/lessons/beginner';
import type { FindErrorStep, RedactStep } from '../src/content/types';

const sections = (scores: Partial<Record<SectionResult['area'], number>>, critical = false): SectionResult[] =>
  (['zasady', 'pisanie', 'poprawianie', 'wiarygodnosc', 'praktyka'] as const).map((area) => ({
    sectionId: area,
    area,
    score: scores[area] ?? 80,
    criticalMiss: critical && area === 'wiarygodnosc',
    notes: critical && area === 'wiarygodnosc' ? ['Nie wykryto istotnego błędu AI'] : undefined,
  }));

describe('Oceń moje osiągnięcia — reguły gotowości', () => {
  it('wysoki wynik bez błędów krytycznych → rekomendacja przejścia', () => {
    const r = computeReadiness('poczatkujacy', sections({ zasady: 100, pisanie: 85, poprawianie: 80, wiarygodnosc: 90, praktyka: 100 }));
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.recommendation).toBe('ready');
    expect(r.headline).toMatch(/poziom średni/);
  });

  it('błąd krytyczny blokuje rekomendację mimo wysokiej średniej', () => {
    const r = computeReadiness('poczatkujacy', sections({ zasady: 100, pisanie: 100, poprawianie: 100, wiarygodnosc: 80, praktyka: 100 }, true));
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.critical).toBe(true);
    expect(r.recommendation).toBe('almost');
    expect(r.criticalReasons.length).toBeGreaterThan(0);
  });

  it('niska ocena wiarygodności blokuje rekomendację', () => {
    const r = computeReadiness('sredni', sections({ zasady: 100, pisanie: 100, poprawianie: 100, wiarygodnosc: 40, praktyka: 100 }));
    expect(r.recommendation).not.toBe('ready');
    expect(r.weaknesses).toContain('wiarygodnosc');
  });

  it('wynik 55–74 → „jesteś blisko” z dwiema umiejętnościami', () => {
    const r = computeReadiness('poczatkujacy', sections({ zasady: 70, pisanie: 60, poprawianie: 55, wiarygodnosc: 70, praktyka: 80 }));
    expect(r.recommendation).toBe('almost');
    expect(r.weaknesses.length).toBe(2);
    expect(r.headline).toMatch(/dwie umiejętności/);
  });

  it('niski wynik → ćwiczenie na obecnym poziomie', () => {
    const r = computeReadiness('poczatkujacy', sections({ zasady: 30, pisanie: 30, poprawianie: 40, wiarygodnosc: 50, praktyka: 40 }));
    expect(r.recommendation).toBe('practice');
  });

  it('poziom zaawansowany: gotowość do samodzielnej pracy', () => {
    const r = computeReadiness('zaawansowany', sections({ zasady: 100, pisanie: 90, poprawianie: 90, wiarygodnosc: 100, praktyka: 100 }));
    expect(r.headline).toMatch(/samodzielnej pracy/);
  });
});

const attempt = (taskId: string, score: number, criteria: TrainerAttempt['criteria']): TrainerAttempt => ({ taskId, score, mode: 'demo', context: 'lab', criteria, at: '2026-01-01' });

describe('Inteligentne dopasowanie nauki', () => {
  it('poniżej 3 prób — tylko zachęta, bez diagnozy', () => {
    expect(getAdaptiveTip({ trainerAttempts: [], level: 'poczatkujacy' })?.kind).toBe('collect');
  });

  it('powtarzający się brak kontekstu → ćwiczenie celowane na kontekst', () => {
    const a = (score: number) =>
      attempt('t-komunikat-zarzadca', score, [
        { id: 'cel', level: 1, skill: 'cel' },
        { id: 'odbiorca', level: 0, skill: 'kontekst' },
        { id: 'praktyczne', level: 0, skill: 'kontekst' },
      ]);
    const tip = getAdaptiveTip({ trainerAttempts: [a(40), a(45), a(50)], level: 'poczatkujacy' });
    expect(tip?.kind).toBe('drill');
    expect(tip?.skill).toBe('kontekst');
    expect(tip?.route).toBe('#/laboratorium/d-kontekst');
    expect(tip?.text).toMatch(/Świetnie radzisz sobie z określaniem celu/);
  });

  it('bardzo dobre wyniki → trudniejsze zadanie', () => {
    const a = (score: number) => attempt('t-komunikat-zarzadca', score, [{ id: 'cel', level: 1, skill: 'cel' }]);
    const tip = getAdaptiveTip({ trainerAttempts: [a(90), a(92), a(95)], level: 'poczatkujacy' });
    expect(tip?.kind).toBe('challenge');
    expect(tip?.route).toMatch(/#\/laboratorium\/t-/);
  });

  it('kolejna lekcja: wznowienie rozpoczętej lub pierwsza nieukończona', () => {
    expect(nextLessonFor({ lessons: {}, lastLessonId: null }, 'poczatkujacy')?.lesson.id).toBe('p-pierwsze-kroki');
    const resumed = nextLessonFor({ lessons: { 'p-sprawdzanie': { stepIndex: 3, completed: false, results: {} } }, lastLessonId: 'p-sprawdzanie' }, 'poczatkujacy');
    expect(resumed?.lesson.id).toBe('p-sprawdzanie');
    expect(resumed?.resume).toBe(true);
  });
});

describe('Dane źródłowe zadań z wykresem i obliczeniami', () => {
  const st = tempStats();
  it('wartości referencyjne wykresu', () => {
    expect(st.maxSupply).toBe(96);
    expect(st.maxSupplyHours).toEqual([7, 8]);
    expect(st.minSupply).toBe(88);
    expect(st.maxRet).toBe(65);
    expect(st.minDelta).toBe(25);
    expect(st.minDeltaHours).toEqual([15]);
    expect(st.avgDelta).toBe(37.5);
  });

  it('błędne zdania w analizie AI są rzeczywiście sprzeczne z danymi', () => {
    const step = LESSON_WYKRESY.steps.find((s) => s.type === 'findError') as FindErrorStep;
    const byId = Object.fromEntries(step.statements.map((s) => [s.id, s]));
    // s2: „zasilanie nie spadło poniżej 90 °C” — fałsz
    expect(st.minSupply < 90).toBe(byId.s2.isError);
    // s4: „średnia ΔT ok. 42 K” — fałsz
    expect(Math.abs(st.avgDelta - 42) > 1).toBe(byId.s4.isError);
    // s7: od 17:00 ΔT w zakresie 37–39 K — prawda
    const after = st.deltas.filter((d) => d.hour >= 17).map((d) => d.delta);
    expect(after.every((d) => d >= 37 && d <= 39)).toBe(!byId.s7.isError);
  });

  it('obliczenia strat ciepła i błędy w lekcji zaawansowanej', () => {
    const loss = heatLossStats();
    expect(loss.lossGJ).toBe(7270);
    expect(loss.lossPct).toBe(15);
    expect(loss.lossMWh).toBe(2019.4);
    const step = LESSON_TESTOWANIE.steps.find((s) => s.type === 'findError') as FindErrorStep;
    expect(step.statements.find((s) => s.id === 's2')!.isError).toBe(true); // zła podstawa procentu (17,6%)
    expect(Math.round((7270 / 41230) * 1000) / 10).toBe(17.6);
    expect(7270 * 3.6).toBe(26172); // błędne przeliczenie z lekcji
  });
});

describe('Ocena ćwiczeń', () => {
  it('kolejność — punktacja par', () => {
    expect(pairwiseOrderScore(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(100);
    expect(pairwiseOrderScore(['c', 'b', 'a'], ['a', 'b', 'c'])).toBe(0);
    expect(pairwiseOrderScore(['b', 'a', 'c'], ['a', 'b', 'c'])).toBe(67);
  });

  it('znajdź błąd — przeoczenie błędu krytycznego', () => {
    const step = LESSON_SPRAWDZANIE.steps.find((s) => s.type === 'findError') as FindErrorStep;
    const allErrors = new Set(step.statements.filter((s) => s.isError).map((s) => s.id));
    expect(scoreFindError(step, allErrors).score).toBe(100);
    const missCritical = new Set([...allErrors].filter((id) => !step.statements.find((s) => s.id === id)!.critical));
    expect(scoreFindError(step, missCritical).criticalMiss).toBe(true);
  });

  it('anonimizacja — pozostawione dane osobowe to błąd krytyczny', () => {
    const step = LESSON_SPRAWDZANIE.steps.find((s) => s.type === 'redact') as RedactStep;
    const sensitive = new Set(step.segments.map((s, i) => (s.sensitive ? i : -1)).filter((i) => i >= 0));
    expect(scoreRedact(step, sensitive).score).toBe(100);
    expect(scoreRedact(step, new Set()).criticalMiss).toBe(true);
  });
});

describe('Dobór poziomu i nawigacja', () => {
  it('sugestia poziomu', () => {
    expect(suggestLevel(1, 2)).toBe('poczatkujacy');
    expect(suggestLevel(3, 0)).toBe('sredni');
    expect(suggestLevel(4, 2)).toBe('zaawansowany');
    expect(suggestLevel(4, 0)).toBe('sredni');
  });

  it('router: adres ↔ ekran', () => {
    const routes: Route[] = [
      { name: 'welcome' },
      { name: 'dashboard' },
      { name: 'lesson', id: 'p-pierwsze-kroki' },
      { name: 'lessons', level: 'sredni' },
      { name: 'labTask', id: 't-raport-miesieczny' },
      { name: 'assessment', level: 'zaawansowany' },
      { name: 'libraryItem', id: 'lib-plan-tygodnia' },
      { name: 'settings' },
    ];
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
    expect(parseHash('#/cos-innego').name).toBe('notFound');
  });
});
