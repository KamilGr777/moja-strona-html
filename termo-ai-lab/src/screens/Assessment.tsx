import { motion } from 'motion/react';
import { ArrowRight, ChevronDown, ClipboardCheck, RotateCcw, ShieldAlert, Sparkles, TrendingUp, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { FindErrorExercise } from '../components/exercises/FindErrorExercise';
import { PromptTrainer } from '../components/exercises/PromptTrainer';
import { QuizView } from '../components/exercises/QuizView';
import { RedactExercise } from '../components/exercises/RedactExercise';
import { ClassifyExercise, OrderExercise } from '../components/exercises/SortExercises';
import { ActionBar, PageHeader } from '../components/layout/AppShell';
import { Button, Callout, Card, LevelPill, ProgressBar, ScoreRing, scoreColor } from '../components/ui';
import { AREA_INFO, ASSESSMENTS, type AssessmentSection } from '../content/assessments';
import { LEVELS } from '../content/levels';
import { getLesson } from '../content/lessons';
import { getTask } from '../content/tasks';
import type { ExerciseResult, LevelId } from '../content/types';
import { ALMOST_THRESHOLD, computeReadiness, MIN_VERIFICATION, READY_THRESHOLD, type Readiness, type SectionResult } from '../lib/assessment';
import { useGhostHelp, useGhostLift } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';

function SectionBody({ section, onResult }: { section: AssessmentSection; onResult: (r: ExerciseResult) => void }) {
  if (section.kind === 'quiz') return <QuizView step={{ type: 'quiz', stage: 'sprobuj', title: section.title, questions: section.questions }} onResult={onResult} assessment />;
  if (section.kind === 'trainer') {
    const task = getTask(section.taskId)!;
    return <PromptTrainer task={task} context="assessment" onResult={onResult} />;
  }
  const step = section.step;
  if (step.type === 'findError') return <FindErrorExercise step={step} onResult={onResult} assessment />;
  if (step.type === 'redact') return <RedactExercise step={step} onResult={onResult} assessment />;
  if (step.type === 'order') return <OrderExercise step={step} onResult={onResult} assessment />;
  return <ClassifyExercise step={step} onResult={onResult} assessment />;
}

export function Assessment({ level }: { level: LevelId }) {
  const def = ASSESSMENTS[level];
  const info = LEVELS[level];
  const storedHistory = useProgress((s) => s.assessments[level]);
  const history = storedHistory ?? [];
  const recordAssessment = useProgress((s) => s.recordAssessment);
  const setLevel = useProgress((s) => s.setLevel);
  const currentLevel = useProgress((s) => s.level);

  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro');
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [sectionKey, setSectionKey] = useState(0);

  const section = def.sections[index];
  const answered = results.some((r) => r.sectionId === section?.id);

  useGhostLift(phase === 'run' ? 4.5 : 0);
  useGhostHelp({
    screen: 'assessment',
    explain:
      phase === 'run'
        ? section?.kind === 'trainer'
          ? `${getTask(section.taskId)?.simpleExplanation ?? ''} W sprawdzianie masz jedną próbę.`
          : 'Wykonaj zadanie i kliknij „Sprawdź” albo wybierz odpowiedzi. Następnie przejdź dalej.'
        : 'Sprawdzian gotowości ma 5 krótkich części. Na końcu zobaczysz wynik, mocne strony i to, co warto poćwiczyć.',
    hints: phase === 'run' ? ['W sprawdzianie nie podpowiadam odpowiedzi — ale możesz poprosić o wyjaśnienie zadania.'] : undefined,
    next: { text: phase === 'intro' ? 'Kliknij „Rozpocznij sprawdzian”.' : phase === 'run' ? (answered ? 'Kliknij „Dalej”, aby przejść do kolejnej części.' : 'Wykonaj zadanie tej części.') : 'Zobacz rekomendację i wybierz, co dalej.' },
  }, 1);

  const onResult = (r: ExerciseResult) => {
    if (!section) return;
    setResults((prev) => [...prev.filter((x) => x.sectionId !== section.id), { sectionId: section.id, area: section.area, score: r.score, criticalMiss: !!r.criticalMiss, notes: r.notes }]);
  };

  const finish = () => {
    const rd = computeReadiness(level, results);
    setReadiness(rd);
    recordAssessment(level, {
      score: rd.score,
      recommendation: rd.recommendation,
      critical: rd.critical,
      areas: Object.fromEntries(rd.areas.map((a) => [a.area, a.score])),
    });
    setPhase('result');
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    setResults([]);
    setIndex(0);
    setReadiness(null);
    setSectionKey((k) => k + 1);
    setPhase('run');
    window.scrollTo({ top: 0 });
  };

  return (
    <div style={{ '--level-color': info.color } as React.CSSProperties}>
      <PageHeader
        back={{ name: 'dashboard' }}
        backLabel="Ekran główny"
        title="Oceń moje osiągnięcia"
        subtitle={def.title}
        right={<LevelPill level={level} />}
      />

      {phase === 'intro' && (
        <div className="grid gap-5">
          <Card>
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ai/15 text-ai">
                <ClipboardCheck className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[1.02rem] leading-relaxed">{def.intro}</p>
                <p className="mt-2 text-sm text-fg-muted">Czas: ok. {def.minutes} minut · 5 części · jedna próba w każdej części</p>
              </div>
            </div>
            <ol className="mt-5 grid gap-2 sm:grid-cols-5">
              {def.sections.map((s, i) => (
                <li key={s.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm">
                  <span className="block text-xs font-semibold text-[var(--level-color)]">Część {i + 1}</span>
                  {AREA_INFO[s.area].label}
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" variant="level" onClick={() => setPhase('run')} iconRight={<ArrowRight className="size-5" aria-hidden="true" />}>
                Rozpocznij sprawdzian
              </Button>
            </div>
          </Card>
          <details className="group rounded-2xl border border-white/8 bg-white/[0.02]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
              Jak liczymy wynik gotowości?
              <ChevronDown className="size-5 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-2 px-4 pb-4 text-[0.95rem] text-fg-muted">
              <p>Wynik to średnia ważona pięciu obszarów: {Object.values(AREA_INFO).map((a) => `${a.label.toLowerCase()} (${a.weight}%)`).join(', ')}.</p>
              <p>
                Rekomendację przejścia dalej dostajesz przy wyniku co najmniej {READY_THRESHOLD}/100 — pod warunkiem, że nie wystąpił błąd krytyczny (np. przeoczone zmyślenie AI, pozostawione dane osobowe, decyzja eksploatacyjna oddana AI) i ocena wiarygodności wynosi co najmniej {MIN_VERIFICATION} pkt.
              </p>
              <p>
                Wynik {ALMOST_THRESHOLD}–{READY_THRESHOLD - 1} oznacza „jesteś blisko” — zaproponujemy dwie umiejętności do utrwalenia. Ocena nie zależy od liczby ukończonych lekcji i nie blokuje zmiany poziomu.
              </p>
            </div>
          </details>
          {history.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display font-semibold">Twoje poprzednie wyniki</h2>
              <ul className="grid gap-2">
                {[...history].reverse().slice(0, 5).map((h) => (
                  <li key={h.at} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-fg-muted">{new Date(h.at).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span className="font-semibold tabular-nums" style={{ color: scoreColor(h.score) }}>
                      {h.score}/100
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {phase === 'run' && section && (
        <div>
          <div data-tour="assessment-progress" className="mb-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">
                Część {index + 1} z {def.sections.length}: {AREA_INFO[section.area].label}
              </span>
            </div>
            <ProgressBar value={((index + (answered ? 1 : 0)) / def.sections.length) * 100} label="Postęp sprawdzianu" />
          </div>
          <div data-tour="assessment-content" key={`${section.id}-${sectionKey}`}>
            <SectionBody section={section} onResult={onResult} />
          </div>
          <ActionBar>
              <span className="px-2 text-sm text-fg-muted">{answered ? 'Odpowiedź zapisana.' : 'Wykonaj zadanie, aby przejść dalej.'}</span>
              <Button
                variant="level"
                disabled={!answered}
                onClick={() => {
                  if (index === def.sections.length - 1) finish();
                  else {
                    setIndex(index + 1);
                    window.scrollTo({ top: 0 });
                  }
                }}
                iconRight={<ArrowRight className="size-4" aria-hidden="true" />}
              >
                {index === def.sections.length - 1 ? 'Zobacz wynik' : 'Dalej'}
              </Button>
          </ActionBar>
        </div>
      )}

      {phase === 'result' && readiness && (
        <div className="grid gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border p-6 sm:p-8"
            style={{ borderColor: `${scoreColor(readiness.score)}55`, background: 'linear-gradient(160deg, rgb(255 255 255 / 0.06), rgb(139 92 246 / 0.06))' }}
          >
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <ScoreRing score={readiness.score} size={150} label="gotowość" />
              <div className="flex-1 text-center sm:text-left">
                <div className="text-sm font-semibold text-fg-muted">Twój poziom gotowości: {readiness.score}/100</div>
                <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{readiness.headline}</h2>
                <p className="mt-2 text-[1.02rem] leading-relaxed text-fg-muted">{readiness.message}</p>
              </div>
            </div>
          </motion.div>

          {readiness.critical && (
            <Callout tone="warn">
              <span className="mb-1 flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="size-4" aria-hidden="true" /> Błędy ważne dla bezpieczeństwa i rzetelności
              </span>
              <ul className="grid gap-1 text-sm">
                {readiness.criticalReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </Callout>
          )}

          <Card>
            <h2 className="mb-4 font-display font-semibold">Wyniki w obszarach</h2>
            <ul className="grid gap-4">
              {readiness.areas.map((a) => (
                <li key={a.area}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{a.label}</span>
                    <span className="font-semibold tabular-nums">{a.score}/100</span>
                  </div>
                  <ProgressBar value={a.score} color={scoreColor(a.score)} label={a.label} />
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ok">
                <Sparkles className="size-5" aria-hidden="true" /> Mocne strony
              </h2>
              {readiness.strengths.length ? (
                <ul className="grid gap-1.5 text-[0.95rem]">
                  {readiness.strengths.map((a) => (
                    <li key={a}>• {AREA_INFO[a].label}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-muted">Jeszcze żaden obszar nie przekroczył 80 pkt — to dobry moment, by poćwiczyć.</p>
              )}
            </Card>
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-heat-soft">
                <TrendingUp className="size-5" aria-hidden="true" /> Do dalszej nauki
              </h2>
              {readiness.weaknesses.length ? (
                <ul className="grid gap-3">
                  {readiness.weaknesses.map((a) => {
                    const lesson = getLesson(AREA_INFO[a].lessonId[level]);
                    return (
                      <li key={a} className="text-[0.95rem]">
                        <div className="font-semibold">{AREA_INFO[a].label}</div>
                        <div className="text-sm text-fg-muted">{AREA_INFO[a].practiceHint}</div>
                        {lesson && (
                          <button type="button" onClick={() => navigate({ name: 'lesson', id: lesson.id })} className="mt-1 min-h-9 rounded-lg px-1 text-sm font-semibold text-tech hover:underline">
                            Powtórz lekcję: {lesson.title}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-fg-muted">Wszystkie obszary na wysokim poziomie.</p>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap gap-3">
              {readiness.recommendation === 'ready' && info.next && (
                <Button
                  size="lg"
                  variant="level"
                  onClick={() => {
                    setLevel(info.next!);
                    navigate({ name: 'dashboard' });
                  }}
                  iconRight={<ArrowRight className="size-5" aria-hidden="true" />}
                >
                  Przejdź na poziom {LEVELS[info.next].name.toLowerCase()}
                </Button>
              )}
              <Button variant="secondary" onClick={restart} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
                Powtórz sprawdzian
              </Button>
              <Button variant="ghost" onClick={() => navigate({ name: 'dashboard' })}>
                Wróć do ekranu głównego
              </Button>
            </div>
            {readiness.recommendation !== 'ready' && info.next && currentLevel === level && (
              <p className="mt-3 flex items-start gap-2 text-sm text-fg-muted">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Rekomendacja nie blokuje zmiany poziomu — możesz go zmienić w każdej chwili na ekranie wyboru poziomu.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
