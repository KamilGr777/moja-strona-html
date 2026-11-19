/**
 * Test wersji jednoplikowej (standalone/TERMO-AI-LAB.html) otwieranej bezpośrednio z dysku (file://),
 * tak jak po pobraniu i dwukliku. Wymaga: npm run build:standalone
 * Uruchomienie: npx tsx e2e/run-standalone.ts
 */
import { createRequire } from 'node:module';
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LESSONS } from '../src/content/lessons';
import { ASSESSMENTS } from '../src/content/assessments';
import { completeLesson, doStep, type Page } from './driver';

/* eslint-disable @typescript-eslint/no-explicit-any */
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const FILE = resolve('standalone/TERMO-AI-LAB.html');
const URL_ = pathToFileURL(FILE).href;
const SHOTS = process.env.E2E_SHOTS ?? 'e2e/screenshots';
mkdirSync(SHOTS, { recursive: true });

const results: { name: string; ok: boolean }[] = [];
async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const info = await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}${info ? ` — ${info}` : ''}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`✗ ${name}\n   ${(e as Error).message.split('\n').slice(0, 4).join('\n   ')}`);
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

(async () => {
  console.log(`Plik: ${FILE} (${(statSync(FILE).size / 1024 / 1024).toFixed(2)} MB)`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page: Page = await ctx.newPage();
  const errors: string[] = [];
  const network: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r: any) => {
    const u: string = r.url();
    if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) network.push(u);
  });

  await check('Plik otwiera się bez serwera: powitanie → wprowadzenie → poziom → ekran główny', async () => {
    await page.goto(URL_);
    await page.getByRole('heading', { name: /Interaktywna Akademia/i }).waitFor();
    await page.screenshot({ path: `${SHOTS}/plik-01-powitanie.png` });
    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click();
    await page.getByRole('button', { name: 'Pomiń' }).click();
    await page.getByRole('button', { name: /Początkujący/ }).first().click();
    await page.getByRole('heading', { name: 'Gotowy na kolejne odkrycie?' }).waitFor();
    await page.getByRole('button', { name: 'Tryb demo' }).waitFor();
    const fontsOk = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px "Inter Variable"') && document.fonts.check('16px "Space Grotesk Variable"');
    });
    assert(fontsOk, 'fonty nie zostały wczytane z pliku');
    const logoOk = await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    assert(logoOk, 'obrazek (logo) nie wczytał się');
  });

  for (const lesson of LESSONS) {
    await check(`Lekcja „${lesson.title}”`, () => completeLesson(page, URL_, lesson.id, ''));
  }

  await check('Wykres (Recharts) renderuje się z pliku', async () => {
    await page.goto(`${URL_}#/lekcja/s-wykresy`);
    await page.locator('[data-tour="lesson-next"]').click();
    await page.locator('.recharts-line').first().waitFor();
    await page.screenshot({ path: `${SHOTS}/plik-02-wykres.png` });
  });

  await check('Sprawdzian gotowości i rekomendacja', async () => {
    const def = ASSESSMENTS.poczatkujacy;
    await page.goto(`${URL_}#/sprawdzian/poczatkujacy`);
    await page.getByRole('button', { name: 'Rozpocznij sprawdzian' }).click();
    for (let i = 0; i < def.sections.length; i++) {
      const s = def.sections[i];
      if (s.kind === 'quiz') await doStep(page, { type: 'quiz', stage: 'sprobuj', title: '', questions: s.questions });
      else if (s.kind === 'trainer') await doStep(page, { type: 'trainer', stage: 'sprobuj', taskId: s.taskId }, { assessment: true });
      else await doStep(page, s.step);
      await page.getByText('Odpowiedź zapisana.').waitFor();
      await page.getByRole('button', { name: i === def.sections.length - 1 ? 'Zobacz wynik' : 'Dalej' }).click();
    }
    await page.getByRole('heading', { name: /Rekomendujemy przejście na poziom średni/ }).waitFor();
  });

  await check('Duszek AI: samouczek i słownik', async () => {
    await page.goto(`${URL_}#/start`);
    await page.getByRole('button', { name: /Pomoc — otwórz/ }).click();
    await page.getByRole('button', { name: 'Pokaż mi, jak korzystać z aplikacji' }).click();
    await page.getByText(/Samouczek · 1 z/i).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Pomoc — otwórz/ }).click();
    await page.getByRole('button', { name: 'Wyjaśnij mi to pojęcie' }).click();
    await page.getByRole('button', { name: 'Anonimizacja' }).click();
    await page.getByText('Przykład:').waitFor();
    await page.keyboard.press('Escape');
  });

  await check('Postęp zostaje po zamknięciu i ponownym otwarciu pliku', async () => {
    await page.close();
    const p2 = await ctx.newPage();
    await p2.goto(URL_);
    await p2.getByRole('button', { name: 'Kontynuuj naukę' }).first().click();
    const txt = await p2.locator('[data-tour="progress-summary"]').innerText();
    assert(/3 z 3 lekcji/.test(txt), `postęp: ${txt}`);
    (globalThis as any).p2 = p2;
    return 'poziom średni, 3/3 lekcji';
  });

  await check('Kopia postępów: pobranie, wyczyszczenie i wczytanie z pliku', async () => {
    const p2: Page = (globalThis as any).p2;
    await p2.goto(`${URL_}#/ustawienia`);
    await p2.getByRole('heading', { name: 'Wersja w jednym pliku' }).waitFor();
    const [download] = await Promise.all([p2.waitForEvent('download'), p2.getByRole('button', { name: 'Pobierz kopię postępów' }).click()]);
    const saved = `${SHOTS}/kopia-postepow.json`;
    await download.saveAs(saved);
    await p2.getByRole('button', { name: 'Wyczyść postępy' }).click();
    await p2.getByRole('button', { name: 'Tak, wyczyść' }).click();
    await p2.getByRole('heading', { name: /Interaktywna Akademia/i }).waitFor();
    await p2.goto(`${URL_}#/ustawienia`);
    await p2.getByLabel('Plik z kopią postępów').setInputFiles(saved);
    await p2.getByText('Wczytano kopię postępów').waitFor();
    await p2.goto(`${URL_}#/postepy`);
    const txt = await p2.locator('main').innerText();
    assert(/Pierwszy prompt/.test(txt) && /3\/3/.test(txt), 'postęp nie został przywrócony');
    await p2.screenshot({ path: `${SHOTS}/plik-03-postepy.png`, fullPage: true });
  });

  await check('Działa bez Internetu', async () => {
    await ctx.setOffline(true);
    const p3 = await ctx.newPage();
    await p3.goto(`${URL_}#/laboratorium/t-komunikat-zarzadca`);
    await p3.locator('textarea').first().fill('Napisz komunikat dla zarządcy o przerwie w dostawie ciepła');
    await p3.getByRole('button', { name: 'Sprawdź mój prompt' }).click();
    await p3.getByText('Ocena według kryteriów').waitFor();
    await ctx.setOffline(false);
  });

  await browser.close();
  console.log('\nŻądania sieciowe poza plikiem:', network.length ? network.join(', ') : 'brak');
  console.log('Błędy w konsoli:', errors.length ? errors.join('\n') : 'brak');
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nWYNIK: ${results.length - failed}/${results.length} scenariuszy zaliczonych.`);
  process.exit(failed || errors.length || network.length ? 1 : 0);
})();
