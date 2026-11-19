import { ArrowRight, Crosshair, Lightbulb } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { PromptTrainer } from '../components/exercises/PromptTrainer';
import { Button, Card, LevelPill, cx } from '../components/ui';
import { LEVEL_ORDER, LEVELS, SKILLS } from '../content/levels';
import { DRILL_TASKS, getTask, LAB_TASKS } from '../content/tasks';
import type { PromptTask } from '../content/types';
import { getAdaptiveTip } from '../lib/adaptive';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';

function TaskCard({ task, best }: { task: PromptTask; best?: number }) {
  const info = LEVELS[task.level];
  return (
    <button
      type="button"
      onClick={() => navigate({ name: 'labTask', id: task.id })}
      className="glass group relative flex h-full flex-col overflow-hidden rounded-2xl p-4 pl-5 text-left transition hover:bg-white/8"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: info.color }} aria-hidden="true" />
      <span className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{task.kind === 'fix' ? 'Napraw prompt' : task.kind === 'data' ? 'Praca z danymi' : task.kind === 'system' ? 'Własny asystent' : task.kind === 'chain' ? 'Instrukcja etapowa' : task.kind === 'document' ? 'Dokument' : 'Napisz prompt'}</span>
        {best !== undefined && (
          <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', best >= 85 ? 'bg-ok/15 text-ok' : 'bg-white/8 text-fg-muted')}>Najlepszy: {best}</span>
        )}
      </span>
      <span className="mt-1.5 font-display font-semibold leading-snug">{task.title}</span>
      <span className="mt-1 text-sm text-fg-muted">{task.short}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold" style={{ color: info.color }}>
        Ćwicz <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  );
}

export function Lab() {
  const state = useProgress();
  const tip = getAdaptiveTip(state);
  const best = (id: string) => {
    const list = state.trainerAttempts.filter((a) => a.taskId === id);
    return list.length ? Math.max(...list.map((a) => a.score)) : undefined;
  };

  useGhostHelp({
    screen: 'lab',
    explain: 'Laboratorium to miejsce do ćwiczeń: wybierasz zadanie, piszesz prompt i dostajesz ocenę z wyjaśnieniem. Możesz ćwiczyć dowolnie długo.',
    next: tip?.route ? { text: tip.text, actionLabel: tip.cta, route: tip.route } : { text: 'Wybierz dowolne zadanie z listy — najlepiej z Twojego poziomu.' },
  });

  return (
    <div>
      <PageHeader title="Laboratorium promptów" subtitle="Praktyczne zadania zawodowe. Napisz polecenie, sprawdź ocenę, popraw i porównaj wynik." />

      <div data-tour="lab-recommend">
        {tip && (
          <Card className="mb-6 border-heat/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Lightbulb className="size-7 shrink-0 text-heat-soft" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-heat-soft">{tip.kind === 'collect' ? 'Polecane dla Ciebie' : 'Sugestia na podstawie Twoich ostatnich ćwiczeń'}</div>
                <p className="mt-1 text-[0.97rem]">{tip.text}</p>
              </div>
              {tip.route && (
                <Button variant="secondary" onClick={() => navigate(tip.route!)}>
                  {tip.cta ?? 'Przejdź'}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      <div data-tour="lab-list" className="grid gap-8">
        {LEVEL_ORDER.map((l) => {
          const tasks = LAB_TASKS.filter((t) => t.level === l);
          return (
            <section key={l} aria-labelledby={`lab-${l}`}>
              <div className="mb-3 flex items-center gap-2">
                <h2 id={`lab-${l}`} className="font-display text-lg font-semibold">
                  Zadania zawodowe
                </h2>
                <LevelPill level={l} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.map((t) => (
                  <TaskCard key={t.id} task={t} best={best(t.id)} />
                ))}
              </div>
            </section>
          );
        })}
        <section aria-labelledby="lab-drills">
          <div className="mb-1 flex items-center gap-2">
            <Crosshair className="size-5 text-heat-soft" aria-hidden="true" />
            <h2 id="lab-drills" className="font-display text-lg font-semibold">
              Ćwiczenia celowane
            </h2>
          </div>
          <p className="mb-3 text-sm text-fg-muted">Krótkie zadania, każde skupione na jednej umiejętności. Aplikacja proponuje je, gdy jakiś element często wypada słabiej.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DRILL_TASKS.map((t) => (
              <div key={t.id} className="relative">
                <TaskCard task={t} best={best(t.id)} />
                {t.focusSkill && <span className="pointer-events-none absolute right-3 top-10 text-[0.7rem] text-fg-subtle">{SKILLS[t.focusSkill].label}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function LabTask({ id }: { id: string }) {
  const task = getTask(id);
  useGhostHelp({
    screen: 'lab-task',
    explain: task?.simpleExplanation,
    hints: task?.hints,
    next: { text: 'Napisz prompt w dużym polu i kliknij „Sprawdź mój prompt”. Potem popraw go według wskazówek i sprawdź ponownie.' },
  });
  if (!task || task.id.startsWith('a-')) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Nie znaleziono ćwiczenia.</p>
        <Button className="mt-4" onClick={() => navigate({ name: 'lab' })}>
          Wróć do Laboratorium
        </Button>
      </div>
    );
  }
  const info = LEVELS[task.level];
  return (
    <div style={{ '--level-color': info.color } as React.CSSProperties}>
      <PageHeader
        back={{ name: 'lab' }}
        backLabel="Laboratorium promptów"
        title={task.title}
        subtitle={task.short}
        right={<LevelPill level={task.level} />}
      />
      <PromptTrainer key={task.id} task={task} context="lab" showTitle={false} />
    </div>
  );
}
