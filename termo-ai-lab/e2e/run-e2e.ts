/**
 * Test end-to-end TERMO AI LAB w prawdziwej przeglądarce (Chromium / Playwright).
 * Wymaga zbudowanej aplikacji i uruchomionych serwerów:
 *   npm run build
 *   PORT=8787 node server-dist/index.mjs      (tryb demonstracyjny — bez klucza API)
 *   npx tsx e2e/mock-ai-server.ts             (atrapa modelu AI, port 8790)
 *   npx tsx e2e/run-e2e.ts
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { LESSONS } from '../src/content/lessons';
import { ASSESSMENTS } from '../src/content/assessments';
import { getTask } from '../src/content/tasks';
import { completeLesson, doStep, type Page } from './driver';

/* eslint-disable @typescript-eslint/no-explicit-any */
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.E2E_BASE ?? 'http://localhost:8787';
const MOCK = process.env.E2E_MOCK ?? 'http://localhost:8790';
const SHOTS = process.env.E2E_SHOTS ?? 'e2e/screenshots';
mkdirSync(SHOTS, { recursive: true });
const AXE = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

const results: { name: string; ok: boolean; info?: string }[] = [];
async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const info = await fn();
    results.push({ name, ok: true, info: info || undefined });
    console.log(`✓ ${name}${info ? ` — ${info}` : ''}`);
  } catch (e) {
    results.push({ name, ok: false, info: (e as Error).message.split('\n')[0] });
    console.log(`✗ ${name}\n   ${(e as Error).message.split('\n').slice(0, 3).join('\n   ')}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
}

async function axe(page: Page, label: string): Promise<string[]> {
  // Czekamy na zakończenie animacji wejścia (półprzezroczysty tekst w trakcie animacji zaniża kontrast).
  await page.waitForTimeout(1500);
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
  });
  return res.filter((v: any) => v.impact === 'serious' || v.impact === 'critical').map((v: any) => `${label}: ${v.id} (${v.impact}, ${v.n}×, np. ${v.sample})`);
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

/* ------------------------------------------------------------------ */

(async () => {
  const browser = await chromium.launch();
  // bypassCSP: tylko po to, by test mógł wstrzyknąć skrypt axe-core (aplikacja ma restrykcyjne CSP).
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], bypassCSP: true });
  const page: Page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m: any) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  const a11y: string[] = [];

  await check('Pierwsze uruchomienie: ekran powitalny → wprowadzenie → wybór poziomu → dashboard', async () => {
    await page.goto(BASE + '/');
    await page.getByRole('heading', { name: /Interaktywna Akademia/i }).waitFor();
    await shot(page, '01-powitanie');
    a11y.push(...(await axe(page, 'powitanie')));
    await page.getByRole('button', { name: /Interaktywna Akademia Sztucznej Inteligencji — kliknij/ }).click();
    await page.getByText('Wprowadzenie · 1 z 3').waitFor();
    await page.getByRole('button', { name: 'Dalej' }).click();
    await page.getByRole('button', { name: 'Dalej' }).click();
    await shot(page, '02-wprowadzenie');
    await page.getByRole('button', { name: 'Wybierz poziom' }).click();
    await page.getByRole('heading', { name: 'Wybierz poziom' }).waitFor();
    a11y.push(...(await axe(page, 'poziomy')));
    await shot(page, '03-poziomy');
    await page.getByRole('button', { name: /Początkujący/ }).first().click();
    await page.getByRole('heading', { name: 'Gotowy na kolejne odkrycie?' }).waitFor();
    await page.getByText('Cześć! Jestem').waitFor();
    await shot(page, '04-dashboard');
    a11y.push(...(await axe(page, 'dashboard')));
    await page.getByRole('button', { name: 'Rozumiem' }).click();
  });

  await check('Przycisk „Pomiń” we wprowadzeniu', async () => {
    await page.goto(BASE + '/#/wprowadzenie');
    await page.getByRole('button', { name: 'Pomiń' }).click();
    await page.waitForURL(/#\/start/);
  });

  await check('Duszek AI uruchamia prawdziwy samouczek ekranu', async () => {
    await page.goto(BASE + '/#/start');
    await page.getByRole('button', { name: /Pomoc — otwórz/ }).click();
    await shot(page, '05-duszek-menu');
    await page.getByRole('button', { name: 'Pokaż mi, jak korzystać z aplikacji' }).click();
    const first = await page.getByText(/Samouczek · 1 z (\d+)/i).innerText();
    const total = Number(first.match(/z (\d+)/i)![1]);
    await shot(page, '06-samouczek');
    for (let i = 1; i < total; i++) await page.getByRole('button', { name: 'Dalej', exact: true }).last().click();
    await page.getByRole('button', { name: 'Zakończ', exact: true }).click();
    assert((await page.getByText(/Samouczek ·/i).count()) === 0, 'samouczek nie został zamknięty');
    return `${total} kroków samouczka`;
  });

  for (const lesson of LESSONS) {
    await check(`Lekcja „${lesson.title}” (${lesson.level}) — od początku do końca`, () => completeLesson(page, BASE, lesson.id));
  }
  await shot(page, '07-lekcja-ukonczona');

  await check('Trenażer: ocena, informacja zwrotna, poprawa i wzrost wyniku', async () => {
    await page.goto(BASE + '/#/laboratorium/t-komunikat-zarzadca');
    const ta = page.locator('textarea').first();
    await ta.fill('Napisz komunikat o przerwie.');
    await page.getByRole('button', { name: 'Sprawdź mój prompt' }).click();
    await page.getByText('Ocena według kryteriów').waitFor();
    const first = Number(await page.locator('[aria-label^="Wynik "]').first().getAttribute('aria-label').then((s: string) => s.match(/\d+/)![0]));
    a11y.push(...(await axe(page, 'trenażer-wynik')));
    await page.getByText('Tryb demonstracyjny · ocena regułowa (bez AI)').first().waitFor();
    await page.getByRole('button', { name: 'Pokaż przykładową lepszą instrukcję' }).click();
    await page.getByText('Przykładowa lepsza instrukcja').waitFor();
    await ta.fill(getTask('t-komunikat-zarzadca')!.examplePrompt);
    await page.getByRole('button', { name: 'Sprawdź ponownie' }).click();
    await page.getByText(/pkt względem poprzedniej próby/).first().waitFor();
    await page.waitForTimeout(700);
    const second = Number(await page.locator('[aria-label^="Wynik "]').last().getAttribute('aria-label').then((s: string) => s.match(/\d+/)![0]));
    assert(second > first, `wynik nie wzrósł (${first} → ${second})`);
    await shot(page, '08-trenazer', true);
    return `${first} → ${second}/100`;
  });

  await check('Duszek: wskazówki stopniowe, wyjaśnienie zadania i słownik pojęć (offline)', async () => {
    await page.goto(BASE + '/#/laboratorium/t-napraw-awaria');
    await page.getByRole('button', { name: /Pomoc — otwórz/ }).click();
    await page.getByRole('button', { name: 'Daj mi wskazówkę' }).click();
    await page.getByText('Wskazówka 1:').waitFor();
    await page.getByRole('button', { name: /Kolejna wskazówka/ }).click();
    await page.getByText('Wskazówka 2:').waitFor();
    await page.getByRole('button', { name: 'Wróć' }).click();
    await page.getByRole('button', { name: 'Nie rozumiem tego zadania' }).click();
    await page.getByText(/Przeanalizuj tę awarię” jest za krótkie/).waitFor();
    await page.getByRole('button', { name: 'Wróć' }).click();
    await page.getByRole('button', { name: 'Wyjaśnij mi to pojęcie' }).click();
    await page.getByPlaceholder(/Wpisz pojęcie/).fill('halucyn');
    await page.getByRole('button', { name: 'Halucynacja (zmyślenie)' }).click();
    await page.getByText('Przykład:').waitFor();
    await shot(page, '09-duszek-pojecie');
    await page.keyboard.press('Escape');
  });

  await check('Oceń moje osiągnięcia (poziom początkujący) — wynik oparty na zadaniach i rekomendacja', async () => {
    const def = ASSESSMENTS.poczatkujacy;
    await page.goto(BASE + '/#/sprawdzian/poczatkujacy');
    await page.getByRole('button', { name: 'Rozpocznij sprawdzian' }).click();
    for (let i = 0; i < def.sections.length; i++) {
      const s = def.sections[i];
      if (s.kind === 'quiz') await doStep(page, { type: 'quiz', stage: 'sprobuj', title: '', questions: s.questions });
      else if (s.kind === 'trainer') await doStep(page, { type: 'trainer', stage: 'sprobuj', taskId: s.taskId }, { assessment: true });
      else await doStep(page, s.step);
      await page.getByText('Odpowiedź zapisana.').waitFor();
      await page.getByRole('button', { name: i === def.sections.length - 1 ? 'Zobacz wynik' : 'Dalej' }).click();
    }
    const txt = await page.getByText(/Twój poziom gotowości: \d+\/100/).innerText();
    await page.getByRole('heading', { name: /Rekomendujemy przejście na poziom średni/ }).waitFor();
    await shot(page, '10-sprawdzian-wynik', true);
    a11y.push(...(await axe(page, 'sprawdzian-wynik')));
    await page.getByRole('button', { name: 'Przejdź na poziom średni' }).click();
    await page.getByRole('heading', { name: 'Gotowy na kolejne odkrycie?' }).waitFor();
    return txt;
  });

  await check('Sprawdzian: błąd krytyczny blokuje rekomendację mimo dobrych odpowiedzi', async () => {
    const def = ASSESSMENTS.sredni;
    await page.goto(BASE + '/#/sprawdzian/sredni');
    await page.getByRole('button', { name: 'Rozpocznij sprawdzian' }).click();
    for (let i = 0; i < def.sections.length; i++) {
      const s = def.sections[i];
      if (s.kind === 'quiz') await doStep(page, { type: 'quiz', stage: 'sprobuj', title: '', questions: s.questions });
      else if (s.kind === 'trainer') await doStep(page, { type: 'trainer', stage: 'sprobuj', taskId: s.taskId }, { assessment: true });
      else if (s.step.type === 'findError') {
        // Oznaczamy tylko błąd niekrytyczny — przeoczony zostaje nieuprawniony wniosek.
        const nonCritical = s.step.statements.find((x) => x.isError && !x.critical)!;
        await page.getByRole('button', { name: new RegExp(nonCritical.text.slice(0, 30)) }).click();
        await page.getByRole('button', { name: 'Sprawdź moje oznaczenia' }).click();
      } else await doStep(page, s.step);
      await page.getByText('Odpowiedź zapisana.').waitFor();
      await page.getByRole('button', { name: i === def.sections.length - 1 ? 'Zobacz wynik' : 'Dalej' }).click();
    }
    await page.getByText('Błędy ważne dla bezpieczeństwa i rzetelności').waitFor();
    assert((await page.getByRole('button', { name: /Przejdź na poziom zaawansowany/ }).count()) === 0, 'pojawiła się rekomendacja przejścia mimo błędu krytycznego');
    return await page.getByText(/Twój poziom gotowości: \d+\/100/).innerText();
  });

  await check('Postęp zapisuje się po ponownym uruchomieniu (przeładowanie i nowa karta)', async () => {
    await page.reload();
    const p2 = await ctx.newPage();
    await p2.goto(BASE + '/#/postepy');
    await p2.getByRole('heading', { name: 'Moje postępy' }).waitFor();
    const txt = await p2.locator('main').innerText();
    assert(/Pierwszy prompt/.test(txt), 'brak odznak');
    const dash = await (async () => {
      await p2.goto(BASE + '/');
      await p2.getByRole('button', { name: 'Kontynuuj naukę' }).first().waitFor();
      await p2.getByRole('button', { name: 'Kontynuuj naukę' }).first().click();
      await p2.getByRole('heading', { name: 'Gotowy na kolejne odkrycie?' }).waitFor();
      return p2.locator('[data-tour="progress-summary"]').innerText();
    })();
    assert(/3 z 3 lekcji/.test(dash), `nieoczekiwany postęp: ${dash}`);
    a11y.push(...(await axe(p2, 'postępy/dashboard')));
    await p2.goto(BASE + '/#/postepy');
    await shot(p2, '11-postepy', true);
    await p2.close();
    return 'poziom średni, 3/3 lekcji, odznaki zachowane';
  });

  await check('Przywracanie ostatnio otwartej lekcji', async () => {
    await page.goto(BASE + '/#/lekcja/s-rozbudowane');
    await page.getByRole('heading', { name: /Rozbudowane polecenia/ }).waitFor();
    await page.locator('[data-tour="lesson-next"]').click();
    await page.getByText('Krok 2 z').waitFor();
    // lekcja ukończona wcześniej — zaczynamy od nowa; sprawdzamy wznowienie lekcji nieukończonej:
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('termo-ai-lab:postep')!);
      raw.state.lessons['s-rozbudowane'].completed = false;
      raw.state.lessons['s-rozbudowane'].stepIndex = 3;
      raw.state.lastLessonId = 's-rozbudowane';
      localStorage.setItem('termo-ai-lab:postep', JSON.stringify(raw));
    });
    await page.goto(BASE + '/');
    await page.reload();
    await page.getByRole('button', { name: /Wróć do lekcji: Rozbudowane polecenia/ }).click();
    await page.getByText('Krok 4 z').waitFor();
  });

  await check('Biblioteka: uzupełnienie pól, podgląd, edycja i kopiowanie', async () => {
    await page.goto(BASE + '/#/biblioteka');
    const count = await page.locator('[data-tour="library-list"] > li').count();
    assert(count >= 12, `za mało promptów: ${count}`);
    await page.getByRole('button', { name: /Komunikat o przerwie w dostawie ciepła/ }).click();
    await page.getByLabel('Termin').fill('czwartek 3 grudnia, 9:00–13:00');
    const prev = await page.locator('[data-tour="library-preview"]').innerText();
    assert(prev.includes('czwartek 3 grudnia') && prev.includes('[BUDYNKI]'), 'podgląd nie odzwierciedla pól');
    await page.getByRole('button', { name: 'Kopiuj polecenie' }).click();
    await page.getByRole('button', { name: 'Skopiowano' }).waitFor();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert(clip.includes('czwartek 3 grudnia'), 'schowek nie zawiera polecenia');
    await page.getByRole('button', { name: 'Edytuj tekst' }).click();
    await page.getByLabel('Edytowalna treść polecenia').fill('Mój własny prompt');
    await page.getByRole('button', { name: 'Przywróć oryginał' }).click();
    a11y.push(...(await axe(page, 'biblioteka')));
    await shot(page, '12-biblioteka', true);
    return `${count} promptów`;
  });

  await check('Zmiana poziomu w dowolnym momencie', async () => {
    await page.goto(BASE + '/#/poziomy');
    await page.getByRole('button', { name: /Zaawansowany/ }).first().click();
    await page.getByRole('heading', { name: 'Gotowy na kolejne odkrycie?' }).waitFor();
    assert((await page.locator('aside').innerText()).includes('Zaawansowany'), 'poziom nie zmieniony');
  });

  await check('Ustawienia: ograniczenie animacji i większy tekst', async () => {
    await page.goto(BASE + '/#/ustawienia');
    await page.getByRole('radio', { name: 'Ograniczone' }).click();
    await page.getByRole('radio', { name: 'Większa' }).click();
    const attrs = await page.evaluate(() => [document.documentElement.dataset.motion, document.documentElement.dataset.largeText]);
    assert(attrs[0] === 'reduce' && attrs[1] === 'true', `atrybuty: ${attrs}`);
    a11y.push(...(await axe(page, 'ustawienia')));
    await shot(page, '13-ustawienia', true);
    await page.getByRole('radio', { name: 'Jak w systemie' }).click();
    await page.getByRole('radio', { name: 'Standardowa' }).click();
  });

  await check('PWA: manifest, ikony i service worker', async () => {
    const manifest = await (await page.request.get(BASE + '/manifest.webmanifest')).json();
    assert(manifest.display === 'standalone' && manifest.lang === 'pl', 'manifest');
    for (const icon of manifest.icons) assert((await page.request.get(`${BASE}/${icon.src}`)).ok(), `ikona ${icon.src}`);
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active && !!navigator.serviceWorker.controller;
    });
    assert(sw, 'service worker nie kontroluje strony');
    return `${manifest.icons.length} ikony, SW aktywny`;
  });

  await check('Tryb offline: aplikacja startuje i lekcje działają bez sieci', async () => {
    await ctx.setOffline(true);
    await page.goto(BASE + '/');
    await page.getByRole('heading', { name: /Interaktywna Akademia/i }).waitFor();
    await page.getByText('Jesteś offline.').waitFor();
    await page.goto(BASE + '/#/lekcja/p-pierwsze-polecenie');
    await page.getByRole('heading', { name: 'Twoje pierwsze polecenie (prompt)' }).waitFor();
    await page.goto(BASE + '/#/laboratorium/t-komunikat-zarzadca');
    await page.locator('textarea').first().fill('Napisz komunikat dla zarządcy o przerwie w dostawie ciepła');
    await page.getByRole('button', { name: 'Sprawdź mój prompt' }).click();
    await page.getByText('Ocena według kryteriów').waitFor();
    await page.getByRole('button', { name: 'Offline' }).waitFor();
    await shot(page, '14-offline');
    await ctx.setOffline(false);
    return 'ocena demonstracyjna działa offline';
  });

  /* --------------------------- Telefon --------------------------- */
  const mobile = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, bypassCSP: true });
  const m: Page = await mobile.newPage();
  m.on('pageerror', (e: Error) => errors.push(`mobile pageerror: ${e.message}`));
  await check('Telefon (360 px): brak poziomego przewijania na kluczowych ekranach', async () => {
    const screens = ['/', '/#/poziomy', '/#/start', '/#/lekcja/s-wykresy', '/#/laboratorium/t-analiza-wykresu', '/#/biblioteka/lib-raport-miesieczny', '/#/sprawdzian/poczatkujacy', '/#/postepy', '/#/ustawienia'];
    await m.goto(BASE + '/');
    await m.evaluate(() => {
      localStorage.setItem('termo-ai-lab:postep', JSON.stringify({ state: { version: 1, introSeen: true, level: 'sredni', settings: { motion: 'system', largeText: false }, lessons: {}, lastLessonId: null, trainerAttempts: [], exercises: {}, skillEvents: [], drafts: {}, points: 0, badges: {}, assessments: {}, placement: null, library: {}, ghostIntroShown: true }, version: 1 }));
    });
    const bad: string[] = [];
    for (const s of screens) {
      await m.goto(BASE + s);
      await m.waitForTimeout(500);
      if (!(await noHorizontalOverflow(m))) bad.push(s);
    }
    await m.goto(BASE + '/#/lekcja/s-wykresy');
    await m.locator('[data-tour="lesson-next"]').click();
    await m.waitForTimeout(800);
    await shot(m, '15-telefon-wykres', true);
    await m.goto(BASE + '/#/start');
    await shot(m, '16-telefon-dashboard', true);
    assert(bad.length === 0, `przewijanie poziome na: ${bad.join(', ')}`);
    return `${screens.length} ekranów`;
  });
  await mobile.close();

  /* ----------------------- Tryb z modelem AI ----------------------- */
  const aiCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ai: Page = await aiCtx.newPage();
  await check('Tryb AI (atrapa modelu): ocena oznaczona jako AI, uruchomienie promptu i porównanie z wartościami źródłowymi', async () => {
    await ai.goto(MOCK + '/');
    await ai.evaluate(() => {
      localStorage.setItem('termo-ai-lab:postep', JSON.stringify({ state: { version: 1, introSeen: true, level: 'sredni', settings: { motion: 'reduce', largeText: false }, lessons: {}, lastLessonId: null, trainerAttempts: [], exercises: {}, skillEvents: [], drafts: {}, points: 0, badges: {}, assessments: {}, placement: null, library: {}, ghostIntroShown: true }, version: 1 }));
    });
    await ai.goto(MOCK + '/#/laboratorium/t-analiza-wykresu');
    await ai.getByRole('button', { name: 'AI połączona' }).waitFor();
    await ai.locator('textarea').first().fill(getTask('t-analiza-wykresu')!.examplePrompt);
    await ai.getByRole('button', { name: 'Sprawdź mój prompt' }).click();
    await ai.getByText(/Ocena modelu AI · atrapa-modelu-testowego/).waitFor();
    await ai.getByRole('button', { name: 'Uruchom mój prompt w AI' }).click();
    await ai.getByText('Porównanie z wartościami źródłowymi').waitFor();
    const cmp = await ai.getByText('Porównanie z wartościami źródłowymi').locator('..').innerText();
    assert(/ta wartość występuje/.test(cmp) && /nie znaleziono/.test(cmp), 'porównanie nie wskazuje znalezionych i brakujących wartości');
    await ai.getByRole('button', { name: 'Pokaż przykładową lepszą instrukcję' }).click();
    await ai.getByText('Twoja instrukcja ulepszona przez model AI').waitFor();
    await shot(ai, '17-tryb-ai', true);
    await ai.getByRole('button', { name: /Pomoc — otwórz/ }).click();
    await ai.getByRole('button', { name: 'Wyjaśnij mi to pojęcie' }).click();
    await ai.getByPlaceholder(/Wpisz pojęcie/).fill('token');
    await ai.getByRole('button', { name: 'Zapytaj model AI' }).click();
    await ai.getByText('Wyjaśnienie atrapy dla pojęcia: token').waitFor();
  });
  await aiCtx.close();

  await browser.close();

  console.log('\n=== Dostępność (axe-core, naruszenia poważne/krytyczne) ===');
  console.log(a11y.length ? a11y.join('\n') : 'brak');
  console.log('\n=== Błędy w konsoli przeglądarki ===');
  const relevant = errors.filter((e) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR/.test(e));
  console.log(relevant.length ? relevant.join('\n') : 'brak');
  const failed = results.filter((r) => !r.ok);
  console.log(`\nWYNIK: ${results.length - failed.length}/${results.length} scenariuszy zaliczonych.`);
  process.exit(failed.length || relevant.length || a11y.length ? 1 : 0);
})();
