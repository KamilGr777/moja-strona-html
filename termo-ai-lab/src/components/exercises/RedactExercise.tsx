import { EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { RedactStep } from '../../content/types';
import { Callout, CopyButton, cx } from '../ui';
import { CheckBar, ResultBanner, type ExerciseCommonProps } from './common';
import { StepHeading } from './StepViews';

export function scoreRedact(step: RedactStep, hidden: Set<number>) {
  const selectable = step.segments.map((s, i) => ({ s, i })).filter((x) => x.s.selectable);
  const correct = selectable.filter((x) => hidden.has(x.i) === !!x.s.sensitive).length;
  const missed = selectable.filter((x) => x.s.sensitive && !hidden.has(x.i));
  const over = selectable.filter((x) => !x.s.sensitive && hidden.has(x.i));
  return {
    score: Math.round((correct / selectable.length) * 100),
    missed,
    over,
    criticalMiss: missed.length > 0,
    notes: missed.map((x) => `Pozostawiono dane osobowe (${x.s.category}).`),
  };
}

export function RedactExercise({ step, onResult, onPhase, assessment }: { step: RedactStep } & ExerciseCommonProps) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const r = scoreRedact(step, hidden);

  const safeText = step.segments.map((s, i) => (hidden.has(i) ? s.replacement ?? '[UKRYTE]' : s.text)).join('');

  return (
    <div>
      <StepHeading kicker="Ochrona danych" title={step.title} lead={step.instruction} />
      <div className="rounded-2xl border border-white/10 bg-ink-950/50 p-4 text-[1.02rem] leading-[2.1] sm:p-5">
        {step.segments.map((s, i) => {
          if (!s.selectable) return <span key={i}>{s.text}</span>;
          const isHidden = hidden.has(i);
          const wrong = checked && isHidden !== !!s.sensitive;
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              aria-pressed={isHidden}
              aria-label={isHidden ? `Ukryte: ${s.text}. Kliknij, aby przywrócić` : `Ukryj: ${s.text}`}
              onClick={() => {
                const next = new Set(hidden);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                setHidden(next);
              }}
              className={cx(
                'mx-0.5 rounded-md border px-1.5 py-0.5 transition',
                isHidden ? 'border-tech/60 bg-tech/15 font-semibold text-tech' : 'border-dashed border-white/30 hover:border-white/60 hover:bg-white/5',
                wrong && 'ring-2 ring-bad',
              )}
            >
              {isHidden ? (
                <span className="inline-flex items-center gap-1">
                  <EyeOff className="size-3.5" aria-hidden="true" />
                  {s.replacement ?? '[UKRYTE]'}
                </span>
              ) : (
                s.text
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-fg-muted">Fragmenty w przerywanych ramkach można kliknąć.</p>
      <CheckBar
        checked={checked}
        canCheck={hidden.size > 0}
        hint="Ukryj co najmniej jeden fragment."
        assessment={assessment}
        onCheck={() => {
          setChecked(true);
          onPhase?.('feedback');
          onResult({ score: r.score, criticalMiss: r.criticalMiss, notes: r.notes, skills: { [step.skill]: r.score } });
        }}
        onRetry={() => {
          setChecked(false);
          onPhase?.('improve');
        }}
      />
      {checked && (
        <div className="mt-4 grid gap-3">
          {!assessment && (
            <ResultBanner score={r.score} good={r.score === 100}>
              {r.missed.length > 0 && <span className="block">Pozostały dane osobowe: {r.missed.map((x) => x.s.category).join(', ')}.</span>}
              {r.over.length > 0 && <span className="block">Niepotrzebnie ukryto: {r.over.map((x) => `„${x.s.text}”`).join(', ')} — to informacje potrzebne do sprawy.</span>}
              {r.score === 100 && <span className="block">Wszystkie dane osobowe ukryte, a sens sprawy zachowany.</span>}
            </ResultBanner>
          )}
          {r.missed.length === 0 && (
            <div className="rounded-2xl border border-ok/25 bg-ok/[0.05] p-4">
              <div className="mb-2 text-sm font-semibold text-ok">Tekst gotowy do wklejenia do AI:</div>
              <p className="prompt-text text-[0.95rem]">{safeText}</p>
              <div className="mt-3">
                <CopyButton text={safeText} />
              </div>
            </div>
          )}
          <Callout tone="info">{step.afterword}</Callout>
        </div>
      )}
    </div>
  );
}
