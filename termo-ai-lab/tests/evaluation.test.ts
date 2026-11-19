import { describe, expect, it } from 'vitest';
import { ALL_TASKS, getTask } from '../src/content/tasks';
import { checkLevel, evaluateDemo } from '../src/lib/demoEvaluator';
import { buildSummary, computeScore, scoreBand, skillScoresFromCriteria } from '../src/lib/scoring';
import { detectPersonalData, normalizePl } from '../src/lib/text';

describe('Ocena demonstracyjna (regułowa)', () => {
  it('przykładowa lepsza instrukcja uzyskuje wysoki wynik w każdym zadaniu', () => {
    for (const t of ALL_TASKS) {
      const ev = evaluateDemo(t, t.examplePrompt);
      expect(ev.score, `${t.id}: ${JSON.stringify(ev.criteria.filter((c) => c.level < 1).map((c) => c.id))}`).toBeGreaterThanOrEqual(85);
    }
  });

  it('nieudane polecenie do poprawienia uzyskuje niski wynik', () => {
    for (const t of ALL_TASKS.filter((x) => x.brokenPrompt)) {
      const ev = evaluateDemo(t, t.brokenPrompt!);
      expect(ev.score, t.id).toBeLessThanOrEqual(45);
    }
  });

  it('jednowyrazowy prompt dostaje niski wynik i ostrzeżenie o długości', () => {
    const t = getTask('t-komunikat-zarzadca')!;
    const ev = evaluateDemo(t, 'komunikat');
    expect(ev.score).toBeLessThan(30);
    expect(ev.warnings.join(' ')).toMatch(/tylko 1 słowo/);
    expect(ev.mode).toBe('demo');
  });

  it('wynik wynika z rubryki: suma wag × poziom spełnienia', () => {
    const t = getTask('t-komunikat-zarzadca')!;
    const ev = evaluateDemo(t, 'Napisz komunikat o przerwie w dostawie ciepła dla zarządcy nieruchomości.');
    expect(ev.score).toBe(computeScore(t, ev.criteria));
    // cel (20) + odbiorca (15) w pełni, fakty częściowo (słowo „przerwa” nie jest faktem) itd.
    const cel = ev.criteria.find((c) => c.id === 'cel')!;
    const odbiorca = ev.criteria.find((c) => c.id === 'odbiorca')!;
    expect(cel.level).toBe(1);
    expect(odbiorca.level).toBe(1);
  });

  it('podsumowanie wskazuje, czego AI jeszcze nie wie', () => {
    const t = getTask('t-komunikat-zarzadca')!;
    const ev = evaluateDemo(t, 'Napisz komunikat o przerwie w dostawie ciepła dla zarządcy nieruchomości. Termin: wtorek 8:00-14:00, ul. Słoneczna 2-8, wymiana zaworu.');
    expect(ev.summary).toMatch(/nie zna jeszcze/);
    expect(ev.summary).toMatch(/formy i długości/);
  });

  it('ostrzega przed danymi osobowymi w poleceniu', () => {
    const t = getTask('t-komunikat-zarzadca')!;
    const ev = evaluateDemo(t, 'Napisz komunikat do Jana, tel. 600 100 200, jan@firma.pl o przerwie');
    expect(ev.warnings.some((w) => w.includes('dane osobowe') || w.includes('danych osobowych'))).toBe(true);
  });

  it('wzorce zabronione zerują kryterium (dane osobowe w ćwiczeniu anonimizacji)', () => {
    const t = getTask('d-bezpieczenstwo')!;
    const bad = evaluateDemo(t, 'Napisz uprzejmą odpowiedź do [ODBIORCA] Jan Nowak, tel. 600 100 200, skarga na wysoki rachunek.');
    expect(bad.criteria.find((c) => c.id === 'dane-osobowe')!.level).toBe(0);
    const good = evaluateDemo(t, 'Napisz uprzejmą odpowiedź do [ODBIORCA], który skarży się na wysoki rachunek za ciepło. Maks. 8 zdań.');
    expect(good.criteria.find((c) => c.id === 'dane-osobowe')!.level).toBe(1);
  });

  it('nie przyznaje punktów za oddanie decyzji AI w poprawianej instrukcji', () => {
    const t = getTask('a-z-popraw')!;
    const ev = evaluateDemo(t, t.brokenPrompt!);
    expect(ev.criteria.find((c) => c.id === 'decyzja')!.level).toBe(0);
  });

  it('checkLevel: pełne, częściowe i brak', () => {
    const check = { groups: [['zarzadc'], ['termin']], full: 2 };
    expect(checkLevel(normalizePl('Zarządca, termin'), check)).toBe(1);
    expect(checkLevel(normalizePl('Zarządca'), check)).toBe(0.5);
    expect(checkLevel(normalizePl('nic'), check)).toBe(0);
  });
});

describe('Wspólna punktacja', () => {
  it('przedziały oceny', () => {
    expect(scoreBand(90).label).toBe('Świetna instrukcja');
    expect(scoreBand(72).label).toBe('Bardzo dobry początek');
    expect(scoreBand(55).label).toBe('Dobry kierunek');
  });

  it('podsumowanie przy komplecie kryteriów', () => {
    const t = getTask('d-cel')!;
    const all = t.criteria.map((c) => ({ id: c.id, level: 1 as const }));
    expect(buildSummary(t, all, 100)).toMatch(/wszystko, czego AI potrzebuje/);
  });

  it('wyniki umiejętności z kryteriów', () => {
    const t = getTask('d-cel')!;
    const res = skillScoresFromCriteria(t, [
      { id: 'cel', level: 1 },
      { id: 'odbiorca', level: 0 },
      { id: 'forma', level: 0.5 },
    ]);
    expect(res.cel).toBe(100);
    expect(res.kontekst).toBe(0);
    expect(res.format).toBe(50);
  });
});

describe('Tekst', () => {
  it('normalizuje polskie znaki', () => {
    expect(normalizePl('Zażółć GĘŚLĄ jaźń')).toBe('zazolc gesla jazn');
  });
  it('wykrywa dane osobowe, ale nie numer 993 ani wartości pomiarowe', () => {
    expect(detectPersonalData('tel. 601 234 567')).toContain('numer telefonu');
    expect(detectPersonalData('PESEL 80010112345')).toContain('numer przypominający PESEL');
    expect(detectPersonalData('Pogotowie 993, 48 500 GJ, 12 480,5 GJ')).toEqual([]);
  });
});
