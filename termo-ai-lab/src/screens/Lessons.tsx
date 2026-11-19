import { CircleCheck, ChevronDown, Clock, PlayCircle } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Button, Icon, ProgressBar, cx } from '../components/ui';
import { lessonsForLevel, getLesson } from '../content/lessons';
import { CURRICULUM, LEVEL_ORDER, LEVELS } from '../content/levels';
import type { LevelId } from '../content/types';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { lessonStatus, useProgress } from '../lib/store';

export function Lessons({ level: levelParam }: { level?: LevelId }) {
  const state = useProgress();
  const level = levelParam ?? state.level ?? 'poczatkujacy';
  const info = LEVELS[level];
  const list = lessonsForLevel(level);
  const modules = CURRICULUM.filter((m) => m.level === level);

  useGhostHelp({
    screen: 'lessons',
    explain: 'Tu widzisz lekcje wybranego poziomu. Każda trwa kilka minut. Kliknij lekcję, aby ją otworzyć.',
    next: { text: 'Wybierz pierwszą nieukończoną lekcję z listy.' },
  });

  return (
    <div style={{ '--level-color': info.color } as React.CSSProperties}>
      <PageHeader title="Lekcje" subtitle="Krótkie lekcje: zobacz, porównaj, spróbuj, popraw i zapamiętaj. Wszystkie poziomy są dostępne." />

      <div data-tour="level-tabs" role="tablist" aria-label="Poziomy" className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-1.5">
        {LEVEL_ORDER.map((l) => {
          const active = l === level;
          return (
            <button
              key={l}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => navigate({ name: 'lessons', level: l }, { replace: true })}
              className={cx('min-h-11 rounded-xl px-2 text-sm font-semibold transition', active ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg')}
              style={active ? { boxShadow: `inset 0 -2px 0 ${LEVELS[l].color}` } : undefined}
            >
              <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: LEVELS[l].color }} aria-hidden="true" />
              {LEVELS[l].name}
            </button>
          );
        })}
      </div>

      <ul data-tour="lesson-list" className="grid gap-3">
        {list.map((lesson) => {
          const status = lessonStatus(state, lesson.id);
          const p = state.lessons[lesson.id];
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => navigate({ name: 'lesson', id: lesson.id })}
                className="glass group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:bg-white/8 sm:p-5"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl border" style={{ color: info.color, borderColor: `${info.color}55`, background: `${info.color}18` }}>
                  <Icon name={lesson.icon} className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Lekcja {lesson.number}</span>
                  <span className="mt-0.5 block font-display text-lg font-semibold leading-snug">{lesson.title}</span>
                  <span className="mt-0.5 block text-sm text-fg-muted">{lesson.subtitle}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" /> ok. {lesson.minutes} min
                    </span>
                    {status === 'done' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-ok">
                        <CircleCheck className="size-3.5" aria-hidden="true" /> Ukończona
                      </span>
                    )}
                    {status === 'started' && p && (
                      <span className="inline-flex items-center gap-1 font-semibold text-tech">
                        <PlayCircle className="size-3.5" aria-hidden="true" /> W trakcie: krok {p.stepIndex + 1} z {lesson.steps.length}
                      </span>
                    )}
                  </span>
                  {status === 'started' && p && (
                    <span className="mt-2 block max-w-xs">
                      <ProgressBar value={((p.stepIndex + 1) / lesson.steps.length) * 100} size="sm" label="Postęp lekcji" />
                    </span>
                  )}
                </span>
                <span className="hidden text-sm font-semibold sm:block" style={{ color: info.color }}>
                  {status === 'done' ? 'Powtórz' : status === 'started' ? 'Kontynuuj' : 'Zacznij'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ai/25 bg-ai/[0.06] p-4">
        <p className="text-[0.95rem]">Chcesz sprawdzić, czy jesteś gotowy na kolejny poziom?</p>
        <Button variant="secondary" onClick={() => navigate({ name: 'assessment', level })}>
          Oceń moje osiągnięcia
        </Button>
      </div>

      <details className="group mt-6 rounded-2xl border border-white/8 bg-white/[0.02]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          Pełny program poziomu {info.name.toLowerCase()} ({modules.length} modułów)
          <ChevronDown className="size-5 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ol className="grid gap-2 px-4 pb-4">
          {modules.map((m) => {
            const available = m.lessonIds.map((id) => getLesson(id)).filter(Boolean);
            return (
              <li key={m.id} className="flex items-start gap-3 rounded-xl border border-white/6 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/8 text-xs font-bold">{m.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-sm text-fg-muted">{m.description}</div>
                  <div className="mt-1 text-xs">
                    {available.length ? (
                      <span className="text-tech">Ćwiczone w: {available.map((l) => l!.title).join(', ')}</span>
                    ) : (
                      <span className="text-fg-subtle">Moduł w przygotowaniu — struktura gotowa do rozbudowy</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
