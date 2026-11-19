import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BuilderStep, ClassifyStep, MatchStep, OrderStep } from '../../content/types';
import { Callout, cx, PromptBlock } from '../ui';
import { CheckBar, ResultBanner, shuffle, Verdict, type ExerciseCommonProps } from './common';
import { StepHeading } from './StepViews';

const TONE: Record<string, string> = {
  ok: 'border-ok/50 bg-ok/12 text-ok',
  warn: 'border-warn/50 bg-warn/12 text-warn',
  bad: 'border-bad/50 bg-bad/12 text-bad',
  info: 'border-sky/50 bg-sky/12 text-sky',
};

/* ------------------------------------------------------------------ */
/* Przypisz do grupy                                                   */
/* ------------------------------------------------------------------ */

export function ClassifyExercise({ step, onResult, onPhase, assessment }: { step: ClassifyStep } & ExerciseCommonProps) {
  const items = useMemo(() => shuffle(step.items, step.items.length + 3), [step.items]);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const allAssigned = items.every((i) => assign[i.id]);

  const check = () => {
    const correct = items.filter((i) => assign[i.id] === i.bucket).length;
    const score = Math.round((correct / items.length) * 100);
    const criticalItems = step.criticalBucket ? items.filter((i) => i.bucket === step.criticalBucket && assign[i.id] !== i.bucket) : [];
    setChecked(true);
    onPhase?.('feedback');
    onResult({
      score,
      skills: { [step.skill]: score },
      criticalMiss: criticalItems.length > 0,
      notes: criticalItems.map((i) => `Zadanie wymagające decyzji człowieka przypisano AI: „${i.text}”.`),
    });
  };

  return (
    <div>
      <StepHeading kicker="Ćwiczenie" title={step.title} lead={step.instruction} />
      <ul className="grid gap-3">
        {items.map((item) => {
          const chosen = assign[item.id];
          const ok = chosen === item.bucket;
          return (
            <li key={item.id} className={cx('rounded-2xl border p-4', checked ? (ok ? 'border-ok/35 bg-ok/[0.05]' : 'border-bad/35 bg-bad/[0.05]') : 'border-white/8 bg-white/[0.03]')}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.98rem] font-medium leading-snug">{item.text}</p>
                {checked && <Verdict correct={ok} />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Przypisz: ${item.text}`}>
                {step.buckets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen === b.id}
                    disabled={checked}
                    onClick={() => setAssign({ ...assign, [item.id]: b.id })}
                    className={cx(
                      'min-h-11 rounded-xl border px-3.5 text-left text-sm font-semibold transition',
                      chosen === b.id ? TONE[b.tone] : 'border-white/10 text-fg-muted hover:bg-white/5',
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              {checked && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.explanation}</p>}
            </li>
          );
        })}
      </ul>
      <CheckBar
        checked={checked}
        canCheck={allAssigned}
        onCheck={check}
        hint="Przypisz wszystkie elementy."
        assessment={assessment}
        onRetry={() => {
          setChecked(false);
          setAssign(Object.fromEntries(Object.entries(assign).filter(([id, b]) => items.find((i) => i.id === id)?.bucket === b)));
          onPhase?.('improve');
        }}
      />
      {checked && !assessment && (
        <ResultBanner score={Math.round((items.filter((i) => assign[i.id] === i.bucket).length / items.length) * 100)}>
          Przeczytaj krótkie wyjaśnienia pod każdym elementem.
        </ResultBanner>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dopasuj fragmenty do elementów promptu                               */
/* ------------------------------------------------------------------ */

export function MatchExercise({ step, onResult, onPhase, assessment }: { step: MatchStep } & ExerciseCommonProps) {
  const items = useMemo(() => shuffle(step.items, 11), [step.items]);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const allAssigned = items.every((i) => assign[i.id]);
  const correctCount = items.filter((i) => assign[i.id] === i.category).length;

  return (
    <div>
      <StepHeading kicker="Ćwiczenie" title={step.title} lead={step.instruction} />
      {step.prompt && (
        <div className="mb-4">
          <PromptBlock>{step.prompt}</PromptBlock>
        </div>
      )}
      <ul className="grid gap-3">
        {items.map((item) => {
          const ok = assign[item.id] === item.category;
          return (
            <li key={item.id} className={cx('rounded-2xl border p-4', checked ? (ok ? 'border-ok/35 bg-ok/[0.05]' : 'border-bad/35 bg-bad/[0.05]') : 'border-white/8 bg-white/[0.03]')}>
              <div className="flex items-start justify-between gap-3">
                <p className="prompt-text text-[0.98rem] leading-snug">„{item.text}”</p>
                {checked && <Verdict correct={ok} />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Element promptu dla: ${item.text}`}>
                {step.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={assign[item.id] === c.id}
                    disabled={checked}
                    onClick={() => setAssign({ ...assign, [item.id]: c.id })}
                    className={cx(
                      'min-h-10 rounded-full border px-3.5 text-sm font-semibold transition',
                      assign[item.id] === c.id ? 'border-[var(--level-color)] bg-[color-mix(in_oklab,var(--level-color)_18%,transparent)] text-fg' : 'border-white/10 text-fg-muted hover:bg-white/5',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {checked && (
                <p className="mt-2 text-sm text-fg-muted">
                  {!ok && <strong className="text-fg">Poprawnie: {step.categories.find((c) => c.id === item.category)?.label}. </strong>}
                  {item.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <CheckBar
        checked={checked}
        canCheck={allAssigned}
        hint="Przypisz wszystkie fragmenty."
        assessment={assessment}
        onCheck={() => {
          const score = Math.round((correctCount / items.length) * 100);
          setChecked(true);
          onPhase?.('feedback');
          onResult({ score, skills: { [step.skill]: score } });
        }}
        onRetry={() => {
          setChecked(false);
          setAssign(Object.fromEntries(Object.entries(assign).filter(([id, c]) => items.find((i) => i.id === id)?.category === c)));
          onPhase?.('improve');
        }}
      />
      {checked && !assessment && <ResultBanner score={Math.round((correctCount / items.length) * 100)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ułóż w kolejności                                                   */
/* ------------------------------------------------------------------ */

export function pairwiseOrderScore(order: string[], correct: string[]): number {
  const pos = new Map(order.map((id, i) => [id, i]));
  let good = 0;
  let total = 0;
  for (let i = 0; i < correct.length; i++) {
    for (let j = i + 1; j < correct.length; j++) {
      total++;
      if ((pos.get(correct[i]) ?? 0) < (pos.get(correct[j]) ?? 0)) good++;
    }
  }
  return total ? Math.round((good / total) * 100) : 100;
}

export function OrderExercise({ step, onResult, onPhase, assessment }: { step: OrderStep } & ExerciseCommonProps) {
  const correct = step.items.map((i) => i.id);
  const [order, setOrder] = useState<string[]>(() => shuffle(correct, correct.length * 5 + 1));
  const [checked, setChecked] = useState(false);
  const textOf = (id: string) => step.items.find((i) => i.id === id)?.text ?? '';
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  };
  const score = pairwiseOrderScore(order, correct);

  return (
    <div>
      <StepHeading kicker="Ćwiczenie" title={step.title} lead={step.instruction} />
      <ol className="grid gap-2.5">
        {order.map((id, idx) => {
          const ok = correct[idx] === id;
          return (
            <li
              key={id}
              className={cx(
                'flex items-center gap-3 rounded-2xl border p-3 pl-4 transition',
                checked ? (ok ? 'border-ok/40 bg-ok/[0.06]' : 'border-bad/40 bg-bad/[0.06]') : 'border-white/8 bg-white/[0.03]',
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/8 text-sm font-bold tabular-nums">{idx + 1}</span>
              <span className="flex-1 text-[0.97rem] leading-snug">{textOf(id)}</span>
              {checked ? (
                <Verdict correct={ok} />
              ) : (
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="grid size-11 place-items-center rounded-xl border border-white/10 text-fg-muted hover:bg-white/5 disabled:opacity-30"
                    aria-label={`Przesuń wyżej: ${textOf(id)}`}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === order.length - 1}
                    className="grid size-11 place-items-center rounded-xl border border-white/10 text-fg-muted hover:bg-white/5 disabled:opacity-30"
                    aria-label={`Przesuń niżej: ${textOf(id)}`}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <CheckBar
        checked={checked}
        canCheck
        assessment={assessment}
        onCheck={() => {
          setChecked(true);
          onPhase?.('feedback');
          onResult({ score, skills: { [step.skill]: score } });
        }}
        onRetry={() => {
          setChecked(false);
          onPhase?.('improve');
        }}
      />
      {checked && (
        <div className="mt-4 grid gap-3">
          {!assessment && <ResultBanner score={score} good={score === 100} />}
          {score < 100 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 text-sm font-semibold">Najlepsza kolejność:</div>
              <ol className="grid gap-1 text-[0.95rem] text-fg-muted">
                {correct.map((id, i) => (
                  <li key={id}>
                    {i + 1}. {textOf(id)}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Callout tone="info">{step.explanation}</Callout>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Złóż instrukcję z klocków                                           */
/* ------------------------------------------------------------------ */

export function BuilderExercise({ step, onResult, onPhase, assessment }: { step: BuilderStep } & ExerciseCommonProps) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const all = step.sections.every((s) => choice[s.id]);
  const correct = step.sections.filter((s) => s.options.find((o) => o.id === choice[s.id])?.best).length;
  const score = Math.round((correct / step.sections.length) * 100);
  const assembled = step.sections.map((s) => s.options.find((o) => o.best)!.text).join('\n');

  return (
    <div>
      <StepHeading kicker="Ćwiczenie" title={step.title} lead={step.instruction} />
      <div className="grid gap-4">
        {step.sections.map((s) => {
          const chosen = s.options.find((o) => o.id === choice[s.id]);
          return (
            <fieldset key={s.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-[var(--level-color)]">{s.label}</legend>
              <div className="mt-1 grid gap-2" role="radiogroup" aria-label={s.label}>
                {s.options.map((o) => {
                  const sel = choice[s.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      disabled={checked}
                      onClick={() => setChoice({ ...choice, [s.id]: o.id })}
                      className={cx(
                        'min-h-12 rounded-xl border px-4 py-2.5 text-left text-[0.95rem] transition',
                        checked && sel && o.best && 'border-ok/60 bg-ok/8',
                        checked && sel && !o.best && 'border-bad/60 bg-bad/8',
                        !checked && sel && 'border-[var(--level-color)] bg-white/8',
                        !sel && 'border-white/10 hover:bg-white/5',
                        checked && !sel && 'opacity-55',
                      )}
                    >
                      <span className="prompt-text">{o.text}</span>
                    </button>
                  );
                })}
              </div>
              {checked && chosen && (
                <p className={cx('mt-2 px-1 text-sm', chosen.best ? 'text-ok' : 'text-bad')}>
                  <strong>{chosen.best ? 'Dobry wybór. ' : 'Ryzykowny wybór. '}</strong>
                  <span className="text-fg-muted">{chosen.feedback}</span>
                </p>
              )}
            </fieldset>
          );
        })}
      </div>
      <CheckBar
        checked={checked}
        canCheck={all}
        hint="Wybierz zapis w każdej części."
        assessment={assessment}
        onCheck={() => {
          setChecked(true);
          onPhase?.('feedback');
          onResult({ score, skills: { [step.skill]: score } });
        }}
        onRetry={() => {
          setChecked(false);
          onPhase?.('improve');
        }}
      />
      {checked && (
        <div className="mt-4 grid gap-3">
          {!assessment && <ResultBanner score={score} good={score === 100} />}
          <div>
            <div className="mb-2 text-sm font-semibold">Gotowa instrukcja z najlepszych klocków:</div>
            <PromptBlock tone="good">{assembled}</PromptBlock>
          </div>
        </div>
      )}
    </div>
  );
}
