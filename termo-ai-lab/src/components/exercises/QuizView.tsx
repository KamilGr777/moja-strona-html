import { motion } from 'motion/react';
import { useState } from 'react';
import type { ChoiceStep, QuizQuestion, QuizStep, SkillId } from '../../content/types';
import { cx, PromptBlock } from '../ui';
import { type ExerciseCommonProps } from './common';
import { StepHeading } from './StepViews';

/** Jedno pytanie z natychmiastowym uzasadnieniem odpowiedzi. */
export function QuestionCard({
  q,
  answer,
  onAnswer,
  promptStyle,
  locked,
  index,
  revealCorrect = true,
}: {
  q: QuizQuestion;
  answer?: string;
  onAnswer: (optionId: string) => void;
  promptStyle?: boolean;
  locked?: boolean;
  index?: number;
  revealCorrect?: boolean;
}) {
  const answered = answer !== undefined;
  return (
    <fieldset className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
      <legend className="sr-only">{q.question}</legend>
      <p className="font-semibold leading-snug" aria-hidden="true">
        {index !== undefined && <span className="mr-1.5 text-[var(--level-color)]">{index + 1}.</span>}
        {q.question}
      </p>
      {q.context && <p className="mt-1 text-sm text-fg-muted">{q.context}</p>}
      <div className="mt-3 grid gap-2">
        {q.options.map((o) => {
          const chosen = answer === o.id;
          const showState = answered && (chosen || (o.correct && revealCorrect));
          return (
            <div key={o.id}>
              <button
                type="button"
                disabled={answered || locked}
                aria-pressed={chosen}
                onClick={() => onAnswer(o.id)}
                className={cx(
                  'w-full rounded-xl border text-left transition',
                  promptStyle ? 'p-0' : 'min-h-12 px-4 py-3',
                  !answered && 'border-white/10 hover:border-[var(--level-color)] hover:bg-white/5',
                  answered && !showState && 'border-white/5 opacity-55',
                  showState && o.correct && 'border-ok/60 bg-ok/8',
                  showState && !o.correct && 'border-bad/60 bg-bad/8',
                )}
              >
                {promptStyle ? <PromptBlock>{o.text}</PromptBlock> : <span className="text-[0.97rem]">{o.text}</span>}
              </button>
              {showState && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cx('mt-1.5 px-1 text-sm leading-relaxed', o.correct ? 'text-ok' : 'text-bad')}
                >
                  <strong>{o.correct ? (chosen ? 'Dobrze! ' : 'Poprawna odpowiedź: ') : 'Nie tym razem. '}</strong>
                  <span className="text-fg-muted">{o.explanation}</span>
                </motion.p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, string>) {
  let correct = 0;
  let criticalMiss = false;
  const skills: Partial<Record<SkillId, { c: number; n: number }>> = {};
  const notes: string[] = [];
  for (const q of questions) {
    const ok = q.options.find((o) => o.id === answers[q.id])?.correct ?? false;
    if (ok) correct++;
    else if (q.critical) {
      criticalMiss = true;
      notes.push(`Błędna odpowiedź w pytaniu dotyczącym bezpieczeństwa lub weryfikacji: „${q.question}”`);
    }
    const s = skills[q.skill] ?? { c: 0, n: 0 };
    s.n++;
    if (ok) s.c++;
    skills[q.skill] = s;
  }
  const skillScores: Partial<Record<SkillId, number>> = {};
  for (const [k, v] of Object.entries(skills) as [SkillId, { c: number; n: number }][]) skillScores[k] = Math.round((v.c / v.n) * 100);
  return { score: Math.round((correct / questions.length) * 100), correct, criticalMiss, skills: skillScores, notes };
}

export function QuizView({ step, onResult, onPhase, assessment }: { step: QuizStep } & ExerciseCommonProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const all = step.questions.every((q) => answers[q.id] !== undefined);
  const result = all ? scoreQuiz(step.questions, answers) : null;

  return (
    <div>
      <StepHeading kicker="Sprawdź się" title={step.title} lead="Wybierz odpowiedź — od razu zobaczysz uzasadnienie." />
      <div className="grid gap-4">
        {step.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            answer={answers[q.id]}
            onAnswer={(id) => {
              const next = { ...answers, [q.id]: id };
              setAnswers(next);
              onPhase?.('feedback');
              if (step.questions.every((x) => next[x.id] !== undefined)) {
                const r = scoreQuiz(step.questions, next);
                onResult({ score: r.score, criticalMiss: r.criticalMiss, skills: r.skills, notes: r.notes });
              }
            }}
          />
        ))}
      </div>
      {result && !assessment && (
        <p className="mt-4 text-[0.97rem] text-fg-muted" role="status">
          Poprawne odpowiedzi: <strong className="text-fg">{result.correct}</strong> z {step.questions.length}.
        </p>
      )}
    </div>
  );
}

export function ChoiceExercise({ step, onResult, onPhase }: { step: ChoiceStep } & ExerciseCommonProps) {
  const [answer, setAnswer] = useState<string | undefined>();
  const [round, setRound] = useState(0);
  const q: QuizQuestion = { id: 'c', question: step.question, context: step.context, options: step.options, skill: step.skill };
  const chosen = step.options.find((o) => o.id === answer);
  return (
    <div>
      <StepHeading kicker="Który lepszy?" title={step.title} />
      <QuestionCard
        key={round}
        q={q}
        answer={answer}
        promptStyle={step.promptStyle}
        revealCorrect={false}
        onAnswer={(id) => {
          setAnswer(id);
          onPhase?.('feedback');
          const ok = step.options.find((o) => o.id === id)?.correct ?? false;
          onResult({ score: ok ? 100 : 0, skills: { [step.skill]: ok ? 100 : 0 } });
        }}
      />
      {chosen && !chosen.correct && (
        <button
          type="button"
          onClick={() => {
            setAnswer(undefined);
            setRound((r) => r + 1);
            onPhase?.('improve');
          }}
          className="mt-3 min-h-11 rounded-xl px-3 text-sm font-semibold text-tech hover:bg-tech/10"
        >
          Spróbuj jeszcze raz
        </button>
      )}
    </div>
  );
}
