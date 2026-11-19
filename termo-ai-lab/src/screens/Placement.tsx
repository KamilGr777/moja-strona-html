import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { QuestionCard } from '../components/exercises/QuizView';
import { Button, Icon, ProgressBar, cx } from '../components/ui';
import { LEVELS } from '../content/levels';
import { PLACEMENT_QUESTIONS, PLACEMENT_USAGE, suggestLevel } from '../content/placement';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';

export function Placement() {
  const [usage, setUsage] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0); // 0 = pytanie o doświadczenie, 1..n = pytania praktyczne
  const setPlacement = useProgress((s) => s.setPlacement);
  const setLevel = useProgress((s) => s.setLevel);
  const total = PLACEMENT_QUESTIONS.length + 1;
  const finished = index >= total;

  useGhostHelp({
    screen: 'placement',
    explain: 'To krótki test, który pomoże dobrać poziom. Odpowiadaj szczerze — wynik to tylko sugestia, a poziom zawsze wybierasz sam.',
    next: { text: finished ? 'Wybierz sugerowany poziom albo wróć do wyboru poziomu.' : 'Wybierz odpowiedź i kliknij „Dalej”.' },
  });

  const correct = PLACEMENT_QUESTIONS.filter((q) => q.options.find((o) => o.id === answers[q.id])?.correct).length;
  const suggestion = finished ? suggestLevel(correct, usage ?? 0) : null;

  const canNext = index === 0 ? usage !== null : answers[PLACEMENT_QUESTIONS[index - 1]?.id] !== undefined;

  const next = () => {
    const ni = index + 1;
    setIndex(ni);
    if (ni >= total) setPlacement(suggestLevel(correct, usage ?? 0));
  };

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate({ name: 'levels' })}
          className="-ml-2 mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Wróć do wyboru poziomu
        </button>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Krótki test doboru poziomu</h1>
        <p className="mt-2 text-fg-muted">5 pytań, ok. 2 minuty. Wynik to sugestia — wybór należy do Ciebie.</p>
        <div className="mt-5">
          <ProgressBar value={(Math.min(index, total) / total) * 100} color="#2dd4bf" label="Postęp testu" />
        </div>

        <div className="mt-6" data-tour="placement-question">
          {!finished && index === 0 && (
            <fieldset className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <legend className="sr-only">{PLACEMENT_USAGE.question}</legend>
              <p className="font-semibold" aria-hidden="true">
                {PLACEMENT_USAGE.question}
              </p>
              <div className="mt-3 grid gap-2" role="radiogroup">
                {PLACEMENT_USAGE.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={usage === o.value}
                    onClick={() => setUsage(o.value)}
                    className={cx('min-h-12 rounded-xl border px-4 text-left text-[0.97rem] transition', usage === o.value ? 'border-tech bg-tech/10' : 'border-white/10 hover:bg-white/5')}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {!finished && index > 0 && (
            <QuestionCard
              key={index}
              q={PLACEMENT_QUESTIONS[index - 1]}
              answer={answers[PLACEMENT_QUESTIONS[index - 1].id]}
              onAnswer={(id) => setAnswers({ ...answers, [PLACEMENT_QUESTIONS[index - 1].id]: id })}
            />
          )}
          {!finished && (
            <div className="mt-5 flex justify-end">
              <Button onClick={next} disabled={!canNext} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
                {index === total - 1 ? 'Zobacz sugestię' : 'Dalej'}
              </Button>
            </div>
          )}

          {finished && suggestion && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border p-6 text-center" style={{ borderColor: `${LEVELS[suggestion].color}66`, background: LEVELS[suggestion].colorSoft }}>
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl" style={{ color: LEVELS[suggestion].color, background: `${LEVELS[suggestion].color}22` }}>
                <Icon name={LEVELS[suggestion].icon} className="size-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
                <Sparkles className="size-4" aria-hidden="true" /> Sugestia na podstawie Twoich odpowiedzi
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold">Poziom {LEVELS[suggestion].name.toLowerCase()}</h2>
              <p className="mt-2 text-fg-muted">{LEVELS[suggestion].subtitle}</p>
              <p className="mt-3 text-sm text-fg-subtle">
                Poprawne odpowiedzi: {correct} z {PLACEMENT_QUESTIONS.length}. To nie jest ocena kompetencji — tylko punkt startowy.
              </p>
              <div className="mx-auto mt-6 grid max-w-xs gap-2">
                <Button
                  onClick={() => {
                    setLevel(suggestion);
                    navigate({ name: 'dashboard' });
                  }}
                  block
                >
                  Zacznij od tego poziomu
                </Button>
                <Button variant="ghost" onClick={() => navigate({ name: 'levels' })} block>
                  Wybiorę sam
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
