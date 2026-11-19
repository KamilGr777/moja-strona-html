import { Check, Lock, Star } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Card, Icon, ProgressBar, cx, scoreColor } from '../components/ui';
import { BADGES } from '../content/badges';
import { LESSONS, lessonsForLevel } from '../content/lessons';
import { LEVEL_ORDER, LEVELS, SKILL_ORDER, SKILLS } from '../content/levels';
import { useGhostHelp } from '../lib/ghost';
import { skillScore, useProgress } from '../lib/store';

function skillLabel(v: number) {
  if (v >= 80) return 'Mocna strona';
  if (v >= 60) return 'Dobrze';
  if (v >= 40) return 'Do utrwalenia';
  return 'Do ćwiczenia';
}

export function Progress() {
  const s = useProgress();
  const learned = LESSONS.filter((l) => s.lessons[l.id]?.completed).flatMap((l) => l.outcomes);

  useGhostHelp({
    screen: 'progress',
    explain: 'Tu widzisz swoje postępy: umiejętności (na podstawie wyników ćwiczeń), odznaki i to, czego już się nauczyłeś.',
    next: { text: 'Najsłabszą umiejętność poćwiczysz w Laboratorium promptów.', actionLabel: 'Laboratorium', route: '#/laboratorium' },
  });

  return (
    <div>
      <PageHeader title="Moje postępy" subtitle="Bez presji i bez terminów — ucz się w swoim tempie." />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Card className="!p-4">
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Star className="size-4 text-heat-soft" aria-hidden="true" /> Punkty
          </div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums">{s.points}</div>
        </Card>
        {LEVEL_ORDER.map((l) => {
          const list = lessonsForLevel(l);
          const done = list.filter((x) => s.lessons[x.id]?.completed).length;
          return (
            <Card key={l} className="!p-4">
              <div className="text-sm text-fg-muted">{LEVELS[l].name}</div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums" style={{ color: LEVELS[l].color }}>
                {done}/{list.length}
              </div>
              <div className="mt-2">
                <ProgressBar value={(done / list.length) * 100} color={LEVELS[l].color} size="sm" label={`Lekcje: ${LEVELS[l].name}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card data-tour="skills-panel">
          <h2 className="font-display text-lg font-semibold">Moje umiejętności</h2>
          <p className="mb-4 mt-1 text-sm text-fg-muted">Średnia z ostatnich wyników ćwiczeń dotyczących danej umiejętności. To orientacyjna informacja, nie ocena kompetencji.</p>
          <ul className="grid gap-4">
            {SKILL_ORDER.map((sk) => {
              const v = skillScore(s.skillEvents, sk);
              return (
                <li key={sk}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{SKILLS[sk].label}</span>
                    <span className="text-fg-muted">{v ? `${skillLabel(v.value)} · ${v.value}%` : 'Brak danych'}</span>
                  </div>
                  <ProgressBar value={v?.value ?? 0} size="sm" color={v ? scoreColor(v.value) : '#334155'} label={SKILLS[sk].label} />
                  <div className="mt-1 text-xs text-fg-subtle">{SKILLS[sk].description}</div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="grid content-start gap-5">
          <Card data-tour="badges-panel">
            <h2 className="mb-4 font-display text-lg font-semibold">
              Odznaki <span className="text-sm font-normal text-fg-muted">({Object.keys(s.badges).length} z {BADGES.length})</span>
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BADGES.map((b) => {
                const earned = !!s.badges[b.id];
                return (
                  <li key={b.id} className={cx('flex flex-col items-center rounded-2xl border p-3 text-center', earned ? 'border-white/12 bg-white/[0.05]' : 'border-white/5 opacity-60')}>
                    <span
                      className="grid size-12 place-items-center rounded-full"
                      style={earned ? { background: `${b.color}24`, color: b.color, boxShadow: `0 0 20px -6px ${b.color}` } : { background: 'rgb(255 255 255 / 0.05)', color: '#7c89a3' }}
                    >
                      {earned ? <Icon name={b.icon} className="size-6" /> : <Lock className="size-5" aria-hidden="true" />}
                    </span>
                    <span className="mt-2 text-sm font-semibold leading-tight">{b.title}</span>
                    <span className="mt-1 text-[0.7rem] leading-snug text-fg-muted">{b.description}</span>
                    <span className="sr-only">{earned ? 'Zdobyta' : 'Jeszcze nie zdobyta'}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">Czego już się nauczyłeś</h2>
            {learned.length ? (
              <ul className="grid gap-2">
                {learned.map((o) => (
                  <li key={o} className="flex gap-2 text-[0.95rem]">
                    <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" /> {o}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">Po ukończeniu pierwszej lekcji zobaczysz tu zdobyte umiejętności.</p>
            )}
          </Card>

          {LEVEL_ORDER.some((l) => s.assessments[l]?.length) && (
            <Card>
              <h2 className="mb-3 font-display text-lg font-semibold">Sprawdziany gotowości</h2>
              <ul className="grid gap-2 text-sm">
                {LEVEL_ORDER.flatMap((l) =>
                  (s.assessments[l] ?? []).slice(-3).map((a) => (
                    <li key={`${l}-${a.at}`} className="flex items-center justify-between gap-3">
                      <span>
                        <span style={{ color: LEVELS[l].color }}>{LEVELS[l].name}</span> · {new Date(a.at).toLocaleDateString('pl-PL')}
                      </span>
                      <span className="font-semibold tabular-nums" style={{ color: scoreColor(a.score) }}>
                        {a.score}/100
                      </span>
                    </li>
                  )),
                )}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
