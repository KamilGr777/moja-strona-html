import { Flag, FileText } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { FindErrorStep } from '../../content/types';
import { cx } from '../ui';
import { CheckBar, ResultBanner, type ExerciseCommonProps } from './common';
import { StepHeading } from './StepViews';

const TempChart = lazy(() => import('./TempChart'));

export function scoreFindError(step: FindErrorStep, flagged: Set<string>) {
  const correct = step.statements.filter((s) => flagged.has(s.id) === s.isError).length;
  const missedCritical = step.statements.filter((s) => s.critical && s.isError && !flagged.has(s.id));
  const errorsFound = step.statements.filter((s) => s.isError && flagged.has(s.id)).length;
  const errorsTotal = step.statements.filter((s) => s.isError).length;
  const falseFlags = step.statements.filter((s) => !s.isError && flagged.has(s.id)).length;
  return {
    score: Math.round((correct / step.statements.length) * 100),
    errorsFound,
    errorsTotal,
    falseFlags,
    criticalMiss: missedCritical.length > 0,
    notes: missedCritical.map((s) => `Nie wykryto istotnego błędu AI: „${s.text}”`),
  };
}

export function FindErrorExercise({ step, onResult, onPhase, assessment }: { step: FindErrorStep } & ExerciseCommonProps) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const r = scoreFindError(step, flagged);

  const toggle = (id: string) => {
    if (checked) return;
    const next = new Set(flagged);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFlagged(next);
  };

  return (
    <div>
      <StepHeading kicker="Znajdź błąd AI" title={step.title} lead={step.instruction} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0">
          {step.chartId && (
            <div className="mb-3">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white/5" />}>
                <TempChart compact />
              </Suspense>
            </div>
          )}
          {!step.chartId && (
            <div className="rounded-2xl border border-sky/25 bg-sky/[0.05] p-4 lg:sticky lg:top-20">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky">
                <FileText className="size-4" aria-hidden="true" /> Źródło: {step.source.title}
              </div>
              <p className="prompt-text text-[0.93rem] leading-relaxed text-fg">{step.source.content}</p>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ai">
            <span className="grid size-6 place-items-center rounded-full bg-ai/20 text-[0.7rem] font-bold">AI</span>
            {step.answerTitle}
            <span className="font-normal text-fg-subtle">(przykład przygotowany do ćwiczenia)</span>
          </div>
          <ul className="grid gap-2">
            {step.statements.map((s) => {
              const isFlagged = flagged.has(s.id);
              const ok = isFlagged === s.isError;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-pressed={isFlagged}
                    disabled={checked}
                    className={cx(
                      'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition',
                      !checked && (isFlagged ? 'border-bad/60 bg-bad/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'),
                      checked && (ok ? 'border-ok/40 bg-ok/[0.06]' : 'border-bad/50 bg-bad/[0.07]'),
                    )}
                  >
                    <span
                      className={cx(
                        'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border',
                        isFlagged ? 'border-bad/60 bg-bad/20 text-bad' : 'border-white/15 text-fg-subtle',
                      )}
                      aria-hidden="true"
                    >
                      <Flag className="size-3.5" />
                    </span>
                    <span className="flex-1 text-[0.97rem] leading-relaxed">
                      {s.text}
                      {checked && (
                        <span className={cx('mt-1.5 block text-sm', s.isError ? 'text-bad' : 'text-ok')}>
                          <strong>{s.isError ? (isFlagged ? 'Słusznie oznaczone: ' : 'Przeoczony błąd: ') : isFlagged ? 'To zdanie było poprawne: ' : 'Poprawne: '}</strong>
                          <span className="text-fg-muted">{s.explanation}</span>
                        </span>
                      )}
                    </span>
                    {!checked && <span className={cx('shrink-0 self-center text-xs font-semibold', isFlagged ? 'text-bad' : 'text-fg-subtle')}>{isFlagged ? 'Błąd' : 'Oznacz'}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <CheckBar
            checked={checked}
            canCheck={flagged.size > 0}
            hint="Oznacz co najmniej jedno zdanie."
            assessment={assessment}
            checkLabel="Sprawdź moje oznaczenia"
            onCheck={() => {
              setChecked(true);
              onPhase?.('feedback');
              onResult({ score: r.score, criticalMiss: r.criticalMiss, notes: r.notes, skills: { [step.skill]: r.score } });
            }}
            onRetry={() => {
              setChecked(false);
              setFlagged(new Set());
              onPhase?.('improve');
            }}
          />
          {checked && !assessment && (
            <ResultBanner score={r.score} good={r.score === 100}>
              Wykryte błędy: {r.errorsFound} z {r.errorsTotal}
              {r.falseFlags > 0 ? `, niepotrzebnie oznaczone poprawne zdania: ${r.falseFlags}` : ''}.
              {r.criticalMiss && <span className="mt-1 block text-bad">Przeoczono błąd istotny dla bezpieczeństwa lub rzetelności — takie zdanie mogłoby trafić do oficjalnego dokumentu.</span>}
            </ResultBanner>
          )}
        </div>
      </div>
    </div>
  );
}
