import { describe, expect, it } from 'vitest';
import { ALL_TASKS, getTask, LAB_TASKS, DRILL_TASKS } from '../src/content/tasks';
import { LESSONS, lessonsForLevel } from '../src/content/lessons';
import { LIBRARY, fillTemplate } from '../src/content/library';
import { ASSESSMENTS, AREA_INFO } from '../src/content/assessments';
import { BADGES } from '../src/content/badges';
import { CURRICULUM, LEVEL_ORDER } from '../src/content/levels';
import { GLOSSARY } from '../src/content/glossary';
import { TOURS } from '../src/content/tours';
import { getLesson } from '../src/content/lessons';
import { isInteractive } from '../src/components/exercises/StepRenderer';

describe('Zadania trenażera i rubryki', () => {
  it('każda rubryka sumuje się do 100 punktów i ma unikalne kryteria', () => {
    for (const t of ALL_TASKS) {
      const sum = t.criteria.reduce((s, c) => s + c.weight, 0);
      expect(sum, t.id).toBe(100);
      expect(new Set(t.criteria.map((c) => c.id)).size, t.id).toBe(t.criteria.length);
    }
  });

  it('identyfikatory zadań są unikalne', () => {
    expect(new Set(ALL_TASKS.map((t) => t.id)).size).toBe(ALL_TASKS.length);
  });

  it('wzorce trybu demonstracyjnego są poprawnymi wyrażeniami regularnymi', () => {
    for (const t of ALL_TASKS) {
      for (const c of t.criteria) {
        for (const g of c.demo.groups) for (const p of g) expect(() => new RegExp(p, 'i'), `${t.id}/${c.id}: ${p}`).not.toThrow();
        for (const p of c.demo.forbidden ?? []) expect(() => new RegExp(p, 'i')).not.toThrow();
        expect(c.demo.full, `${t.id}/${c.id}`).toBeLessThanOrEqual(c.demo.groups.length);
      }
    }
  });

  it('każde ćwiczenie ma wyjaśnienie, podpowiedzi, przykład i wskazówkę weryfikacji', () => {
    for (const t of ALL_TASKS) {
      expect(t.simpleExplanation.length, t.id).toBeGreaterThan(40);
      expect(t.hints.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.examplePrompt.length, t.id).toBeGreaterThan(80);
      expect(t.verifyTip.length, t.id).toBeGreaterThan(20);
    }
  });

  it('ćwiczenia celowane mają przypisaną umiejętność', () => {
    for (const d of DRILL_TASKS) expect(d.focusSkill).toBeTruthy();
  });

  it('laboratorium obejmuje wszystkie poziomy', () => {
    for (const l of LEVEL_ORDER) expect(LAB_TASKS.some((t) => t.level === l)).toBe(true);
  });
});

describe('Lekcje (MVP)', () => {
  it('co najmniej 3 pełne lekcje na każdym poziomie (9 łącznie)', () => {
    for (const l of LEVEL_ORDER) expect(lessonsForLevel(l).length).toBeGreaterThanOrEqual(3);
    expect(LESSONS.length).toBeGreaterThanOrEqual(9);
  });

  it('każda lekcja ma co najmniej 2 elementy interaktywne i kończy się zasadą do zapamiętania', () => {
    for (const lesson of LESSONS) {
      const interactive = lesson.steps.filter(isInteractive);
      expect(interactive.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.steps[0].stage, lesson.id).toBe('zobacz');
      expect(lesson.steps[lesson.steps.length - 1].type, lesson.id).toBe('remember');
      expect(lesson.steps.some((s) => s.stage === 'sprobuj'), lesson.id).toBe(true);
      expect(lesson.outcomes.length, lesson.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('kroki trenażera wskazują istniejące zadania', () => {
    for (const lesson of LESSONS) for (const s of lesson.steps) if (s.type === 'trainer') expect(getTask(s.taskId), s.taskId).toBeTruthy();
  });

  it('pytania testowe mają dokładnie jedną poprawną odpowiedź i uzasadnienia', () => {
    for (const lesson of LESSONS) {
      for (const s of lesson.steps) {
        const questions = s.type === 'quiz' || s.type === 'chart' ? s.questions : s.type === 'choice' ? [{ id: 'c', options: s.options }] : [];
        for (const q of questions) {
          expect(q.options.filter((o) => o.correct).length, `${lesson.id}/${q.id}`).toBe(1);
          for (const o of q.options) expect(o.explanation.length).toBeGreaterThan(5);
        }
      }
    }
  });

  it('ćwiczenia „Znajdź błąd” zawierają błędy i zdania poprawne', () => {
    for (const lesson of LESSONS) {
      for (const s of lesson.steps) {
        if (s.type !== 'findError') continue;
        expect(s.statements.some((x) => x.isError)).toBe(true);
        expect(s.statements.some((x) => !x.isError)).toBe(true);
      }
    }
  });

  it('symulacje rozmów są spójne (każde przejście prowadzi do istniejącego węzła i do końca)', () => {
    for (const lesson of LESSONS) {
      for (const s of lesson.steps) {
        if (s.type !== 'chat') continue;
        expect(s.nodes[s.start]).toBeTruthy();
        for (const n of Object.values(s.nodes)) {
          if (!n.end) expect(n.choices?.length).toBeGreaterThan(0);
          for (const c of n.choices ?? []) expect(s.nodes[c.next], c.next).toBeTruthy();
          if (n.choices) expect(n.choices.some((c) => c.good)).toBe(true);
        }
        expect(Object.values(s.nodes).some((n) => n.end)).toBe(true);
      }
    }
  });

  it('program nauczania odwołuje się wyłącznie do istniejących lekcji', () => {
    for (const m of CURRICULUM) for (const id of m.lessonIds) expect(getLesson(id), id).toBeTruthy();
  });
});

describe('Biblioteka promptów', () => {
  it('zawiera co najmniej 12 promptów we wszystkich wymaganych kategoriach', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(12);
    const cats = new Set(LIBRARY.map((p) => p.category));
    expect(cats.size).toBe(9);
  });

  it('każde pole szablonu ma definicję i odwrotnie', () => {
    for (const p of LIBRARY) {
      const keys = new Set([...p.template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));
      expect([...keys].sort(), p.id).toEqual(p.fields.map((f) => f.key).sort());
      expect(p.verifyTip.length).toBeGreaterThan(10);
    }
  });

  it('wypełnianie szablonu wstawia wartości, a puste pola oznacza w nawiasach', () => {
    const p = LIBRARY.find((x) => x.id === 'lib-komunikat-przerwa')!;
    const out = fillTemplate(p, { termin: 'wtorek 8:00–14:00' });
    expect(out).toContain('wtorek 8:00–14:00');
    expect(out).toContain('[BUDYNKI]');
    expect(out).not.toContain('{{');
  });
});

describe('Sprawdziany gotowości', () => {
  it('każdy poziom ma 5 części obejmujących wszystkie obszary', () => {
    for (const l of LEVEL_ORDER) {
      const def = ASSESSMENTS[l];
      expect(def.sections.length).toBe(5);
      expect(new Set(def.sections.map((s) => s.area))).toEqual(new Set(Object.keys(AREA_INFO)));
      for (const s of def.sections) if (s.kind === 'trainer') expect(getTask(s.taskId), s.taskId).toBeTruthy();
    }
  });

  it('wagi obszarów sumują się do 100', () => {
    expect(Object.values(AREA_INFO).reduce((s, a) => s + a.weight, 0)).toBe(100);
  });
});

describe('Pozostałe treści', () => {
  it('odznaki mają unikalne identyfikatory i obejmują wymagane przykłady', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    const titles = BADGES.map((b) => b.title);
    for (const t of ['Pierwszy prompt', 'Odkrywca AI', 'Mistrz precyzji', 'Łowca błędów', 'Analityk danych', 'Ekspert komunikacji z AI']) expect(titles).toContain(t);
  });

  it('słownik i samouczki są kompletne', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(10);
    for (const steps of Object.values(TOURS)) expect(steps.length).toBeGreaterThan(0);
  });
});
