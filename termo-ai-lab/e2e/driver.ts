/** Wspólne funkcje testów E2E: wykonywanie kroków lekcji na podstawie treści aplikacji. */
import { LESSONS } from '../src/content/lessons';
import { getTask } from '../src/content/tasks';
import type { LessonStep } from '../src/content/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Page = any;

/* ------------------------------------------------------------------ */
/* Wykonywanie kroków lekcji na podstawie treści                        */
/* ------------------------------------------------------------------ */

export async function doStep(page: Page, step: LessonStep, opts: { assessment?: boolean } = {}) {
  const sprawdz = () => page.getByRole('button', { name: 'Sprawdź', exact: true }).click();
  switch (step.type) {
    case 'concept':
    case 'compare':
    case 'tools':
    case 'remember':
      return;
    case 'classify':
      for (const item of step.items) {
        const bucket = step.buckets.find((b) => b.id === item.bucket)!;
        await page.locator('li', { hasText: item.text }).getByRole('radio', { name: bucket.label }).click();
      }
      return sprawdz();
    case 'match':
      for (const item of step.items) {
        const cat = step.categories.find((c) => c.id === item.category)!;
        await page.locator('li', { hasText: item.text }).getByRole('radio', { name: cat.label, exact: true }).click();
      }
      return sprawdz();
    case 'order': {
      for (let i = 0; i < step.items.length; i++) {
        const want = step.items[i].text;
        for (let guard = 0; guard < 10; guard++) {
          const texts: string[] = await page.locator('ol > li span.flex-1').allInnerTexts();
          const idx = texts.findIndex((t) => t.trim() === want);
          if (idx <= i) break;
          await page.getByRole('button', { name: `Przesuń wyżej: ${want}` }).click();
        }
      }
      return sprawdz();
    }
    case 'builder':
      for (const s of step.sections) {
        const best = s.options.find((o) => o.best)!;
        await page.getByRole('radiogroup', { name: s.label }).getByRole('radio', { name: best.text }).click();
      }
      return sprawdz();
    case 'findError':
      for (const s of step.statements.filter((x) => x.isError)) await page.getByRole('button', { name: new RegExp(s.text.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
      return page.getByRole('button', { name: 'Sprawdź moje oznaczenia' }).click();
    case 'redact':
      for (const s of step.segments.filter((x) => x.sensitive)) await page.getByRole('button', { name: `Ukryj: ${s.text}` }).click();
      return sprawdz();
    case 'chat': {
      let node = step.start;
      while (!step.nodes[node].end) {
        const good = step.nodes[node].choices!.find((c) => c.good)!;
        await page.getByRole('button', { name: good.text }).click();
        node = good.next;
      }
      return;
    }
    case 'choice': {
      const ok = step.options.find((o) => o.correct)!;
      return page.getByRole('button', { name: ok.text }).click();
    }
    case 'quiz':
    case 'chart':
      for (const q of step.questions) {
        const ok = q.options.find((o) => o.correct)!;
        await page.locator('fieldset', { hasText: q.question }).getByRole('button', { name: ok.text, exact: true }).click();
      }
      return;
    case 'trainer': {
      const task = getTask(step.taskId)!;
      await page.locator('textarea').first().fill(task.examplePrompt);
      await page.getByRole('button', { name: opts.assessment ? 'Zatwierdź odpowiedź' : 'Sprawdź mój prompt' }).click();
      await page.getByText('Informacja zwrotna', { exact: true }).first().waitFor();
      return;
    }
  }
}

export async function completeLesson(page: Page, base: string, lessonId: string, sep = '/'): Promise<string> {
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  await page.goto(`${base}${sep}#/lekcja/${lessonId}`);
  await page.getByRole('heading', { name: lesson.title, level: 1 }).waitFor();
  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i];
    await page.getByText(`Krok ${i + 1} z ${lesson.steps.length}`).waitFor();
    await doStep(page, step);
    const next = page.locator('[data-tour="lesson-next"]');
    if (i === lesson.steps.length - 1) {
      await next.click();
    } else {
      await page.waitForFunction(() => !(document.querySelector('[data-tour="lesson-next"]') as HTMLButtonElement).disabled, null, { timeout: 5000 });
      await next.click();
    }
  }
  await page.getByRole('heading', { name: 'Lekcja ukończona!' }).waitFor();
  return `${lesson.steps.length} kroków`;
}

