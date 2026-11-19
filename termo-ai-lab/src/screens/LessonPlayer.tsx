import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Home, PartyPopper, SkipForward, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isInteractive, StepRenderer, stepHelp } from '../components/exercises/StepRenderer';
import type { Phase } from '../components/exercises/common';
import { ActionBar } from '../components/layout/AppShell';
import { Button, Icon, LevelPill, ProgressBar, cx } from '../components/ui';
import { BADGES } from '../content/badges';
import { getLesson, lessonsForLevel } from '../content/lessons';
import { LEVELS } from '../content/levels';
import type { ExerciseResult, StageId } from '../content/types';
import { useGhostHelp, useGhostLift } from '../lib/ghost';
import { useReducedMotionPref } from '../lib/motion';
import { navigate } from '../lib/router';
import { useProgress, type ExerciseType } from '../lib/store';

const STAGES: { id: StageId; label: string }[] = [
  { id: 'zobacz', label: 'Zobacz' },
  { id: 'porownaj', label: 'Porównaj' },
  { id: 'sprobuj', label: 'Spróbuj' },
  { id: 'feedback', label: 'Informacja zwrotna' },
  { id: 'popraw', label: 'Popraw' },
  { id: 'zapamietaj', label: 'Zapamiętaj' },
];

function Burst() {
  const reduce = useReducedMotionPref();
  const parts = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2, d: 70 + (i % 3) * 30, c: ['#2dd4bf', '#a78bfa', '#fbbf24', '#34d399'][i % 4] })),
    [],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-12" aria-hidden="true">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-full"
          style={{ background: p.c, boxShadow: `0 0 10px ${p.c}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(p.a) * p.d, y: Math.sin(p.a) * p.d, opacity: 0, scale: 0.4 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
        />
      ))}
    </div>
  );
}

export function LessonPlayer({ id }: { id: string }) {
  const lesson = getLesson(id);
  const progress = useProgress((s) => (lesson ? s.lessons[lesson.id] : undefined));
  const setLessonStep = useProgress((s) => s.setLessonStep);
  const recordStepResult = useProgress((s) => s.recordStepResult);
  const completeLesson = useProgress((s) => s.completeLesson);
  const allBadges = useProgress((s) => s.badges);

  const [index, setIndex] = useState(() => (progress && !progress.completed ? Math.min(progress.stepIndex, (lesson?.steps.length ?? 1) - 1) : 0));
  const [done, setDone] = useState<Set<number>>(() => new Set(Object.keys(progress?.results ?? {}).map(Number)));
  const [phase, setPhase] = useState<Phase | null>(null);
  const [finished, setFinished] = useState<{ points: number; badges: string[] } | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lesson) setLessonStep(lesson.id, index);
    setPhase(null);
    topRef.current?.scrollIntoView({ block: 'start' });
    window.scrollTo({ top: 0 });
  }, [index, lesson, setLessonStep]);

  const step = lesson?.steps[index];
  const stepDone = step ? !isInteractive(step) || done.has(index) : false;
  const help = step ? stepHelp(step, stepDone) : {};
  const isLastStep = !!lesson && index === lesson.steps.length - 1;
  useGhostLift(finished ? 0 : stepDone || isLastStep ? 4.5 : 5.75);

  useGhostHelp({
    screen: 'lesson',
    explain: help.explain,
    hints: help.hints,
    next: finished
      ? { text: 'Lekcja ukończona! Przejdź do następnej lekcji albo wróć do ekranu głównego.' }
      : help.next,
  }, 1);

  if (!lesson || !step) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Nie znaleziono lekcji.</p>
        <Button className="mt-4" onClick={() => navigate({ name: 'lessons' })}>
          Wróć do listy lekcji
        </Button>
      </div>
    );
  }

  const info = LEVELS[lesson.level];
  const levelLessons = lessonsForLevel(lesson.level);
  const nextLesson = levelLessons.find((l) => l.number === lesson.number + 1);

  const currentStage: StageId = phase === 'feedback' ? 'feedback' : phase === 'improve' ? 'popraw' : step.stage;
  const visited = new Set<StageId>(lesson.steps.slice(0, index).map((s) => s.stage));
  if (done.size > 0 && lesson.steps.slice(0, index + 1).some((s, i) => isInteractive(s) && done.has(i))) visited.add('feedback');

  const onResult = (r: ExerciseResult) => {
    setDone((d) => new Set(d).add(index));
    if (step.type === 'trainer') return; // trenażer zapisuje własne próby
    recordStepResult(lesson.id, index, `${lesson.id}:${index}`, step.type as ExerciseType, r);
  };

  const last = index === lesson.steps.length - 1;

  const finish = () => {
    const points = completeLesson(lesson.id);
    const state = useProgress.getState();
    const newOnes = Object.entries(state.badges)
      .filter(([, at]) => at >= startedAt.current)
      .map(([bid]) => bid);
    useProgress.setState({ newBadges: state.newBadges.filter((b) => !newOnes.includes(b)) });
    setFinished({ points, badges: newOnes });
    window.scrollTo({ top: 0 });
  };

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl" style={{ '--level-color': info.color } as React.CSSProperties}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-3xl border p-6 text-center sm:p-10" style={{ borderColor: `${info.color}55`, background: `linear-gradient(160deg, ${info.colorSoft}, rgb(139 92 246 / 0.08))` }}>
          <Burst />
          <div className="mx-auto grid size-20 place-items-center rounded-full" style={{ background: `${info.color}22`, color: info.color, boxShadow: `0 0 50px -10px ${info.color}` }}>
            <PartyPopper className="size-10" aria-hidden="true" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold" tabIndex={-1} data-page-title>
            Lekcja ukończona!
          </h1>
          <p className="mt-2 text-fg-muted">{lesson.title}</p>
          {finished.points > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-heat/12 px-4 py-2 font-semibold text-heat-soft">
              <Star className="size-4" aria-hidden="true" /> +{finished.points} punktów
            </div>
          )}
          <div className="mt-6 text-left">
            <h2 className="mb-2 font-semibold">Czego się nauczyłeś</h2>
            <ul className="grid gap-2">
              {lesson.outcomes.map((o) => (
                <li key={o} className="flex gap-2.5 text-[0.97rem]">
                  <Check className="mt-0.5 size-5 shrink-0" style={{ color: info.color }} aria-hidden="true" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
          {finished.badges.length > 0 && (
            <div className="mt-6 text-left">
              <h2 className="mb-2 font-semibold">Nowe odznaki</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {finished.badges.map((bid) => {
                  const b = BADGES.find((x) => x.id === bid);
                  if (!b) return null;
                  return (
                    <div key={bid} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="grid size-10 place-items-center rounded-full" style={{ background: `${b.color}22`, color: b.color }}>
                        <Icon name={b.icon} className="size-5" />
                      </span>
                      <div>
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-xs text-fg-muted">{b.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mx-auto mt-8 grid max-w-sm gap-2">
            {nextLesson ? (
              <Button size="lg" variant="level" onClick={() => navigate({ name: 'lesson', id: nextLesson.id })} iconRight={<ArrowRight className="size-5" aria-hidden="true" />} block>
                Następna lekcja: {nextLesson.title}
              </Button>
            ) : (
              <Button size="lg" variant="level" onClick={() => navigate({ name: 'assessment', level: lesson.level })} block>
                Oceń moje osiągnięcia
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate({ name: 'dashboard' })} icon={<Home className="size-4" aria-hidden="true" />} block>
              Wróć do ekranu głównego
            </Button>
          </div>
        </motion.div>
        <p className="mt-4 text-center text-sm text-fg-subtle">Zdobyte odznaki: {Object.keys(allBadges).length} z {BADGES.length}</p>
      </div>
    );
  }

  return (
    <div ref={topRef} style={{ '--level-color': info.color } as React.CSSProperties} className="scroll-mt-20">
      {/* Nagłówek lekcji */}
      <div className="mb-4">
        <button
          type="button"
          data-tour="lesson-back"
          onClick={() => navigate({ name: 'lessons', level: lesson.level })}
          className="-ml-2 mb-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Lekcje
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <LevelPill level={lesson.level} />
          <span className="text-sm text-fg-muted">Lekcja {lesson.number}</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl" tabIndex={-1} data-page-title>
          {lesson.title}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={((index + 1) / lesson.steps.length) * 100} label="Postęp lekcji" size="sm" />
          </div>
          <span className="shrink-0 text-sm tabular-nums text-fg-muted">
            Krok {index + 1} z {lesson.steps.length}
          </span>
        </div>
      </div>

      {/* Etapy lekcji */}
      <nav aria-label="Etapy lekcji" data-tour="stage-tracker" className="mb-6">
        <ol className="hidden gap-1.5 sm:flex">
          {STAGES.map((s) => {
            const isCurrent = s.id === currentStage;
            const isVisited = visited.has(s.id) && !isCurrent;
            return (
              <li
                key={s.id}
                aria-current={isCurrent ? 'step' : undefined}
                className={cx(
                  'flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border px-2 text-center text-xs font-semibold transition',
                  isCurrent && 'border-[var(--level-color)] bg-[color-mix(in_oklab,var(--level-color)_18%,transparent)] text-fg',
                  isVisited && 'border-white/10 text-fg-muted',
                  !isCurrent && !isVisited && 'border-white/6 text-fg-subtle',
                )}
              >
                {isVisited && <Check className="size-3.5 text-[var(--level-color)]" aria-hidden="true" />}
                {s.label}
              </li>
            );
          })}
        </ol>
        <div className="flex items-center justify-between rounded-full border border-white/8 px-4 py-2 sm:hidden">
          <span className="text-sm">
            Etap: <strong style={{ color: 'var(--level-color)' }}>{STAGES.find((s) => s.id === currentStage)?.label}</strong>
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {STAGES.map((s) => (
              <span key={s.id} className={cx('size-2 rounded-full', s.id === currentStage ? 'bg-[var(--level-color)]' : visited.has(s.id) ? 'bg-white/40' : 'bg-white/12')} />
            ))}
          </span>
        </div>
      </nav>

      {/* Treść kroku */}
      <div data-tour="lesson-content">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <StepRenderer step={step} onResult={onResult} onPhase={setPhase} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nawigacja kroków */}
      <ActionBar hint={!stepDone && !last ? 'Wykonaj ćwiczenie powyżej, aby przejść dalej.' : undefined}>
          <Button variant="ghost" onClick={() => setIndex(index - 1)} disabled={index === 0} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
            Wstecz
          </Button>
          <div className="flex items-center gap-1">
            {!stepDone && (
              <button type="button" onClick={() => setIndex(index + 1)} disabled={last} className="hidden min-h-11 items-center gap-1 rounded-lg px-3 text-sm text-fg-subtle hover:text-fg-muted disabled:hidden sm:inline-flex">
                <SkipForward className="size-4" aria-hidden="true" /> Pomiń krok
              </button>
            )}
            <Button
              data-tour="lesson-next"
              variant="level"
              onClick={() => (last ? finish() : setIndex(index + 1))}
              disabled={!stepDone && !last}
              iconRight={last ? <Check className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
              title={!stepDone ? 'Najpierw wykonaj ćwiczenie powyżej' : undefined}
            >
              {last ? 'Zakończ lekcję' : 'Dalej'}
            </Button>
          </div>
      </ActionBar>
    </div>
  );
}
