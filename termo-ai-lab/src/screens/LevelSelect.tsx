import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Compass, Sparkles } from 'lucide-react';
import { Icon, ProgressBar, cx } from '../components/ui';
import { lessonsForLevel } from '../content/lessons';
import { LEVEL_ORDER, LEVELS } from '../content/levels';
import type { LevelId } from '../content/types';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';

export function LevelSelect() {
  const { level: current, setLevel, placement, lessons, assessments } = useProgress();

  const suggested: LevelId | null = (() => {
    // Rekomendacja ze sprawdzianu ma pierwszeństwo przed testem doboru poziomu.
    for (const l of LEVEL_ORDER) {
      const last = assessments[l]?.[assessments[l]!.length - 1];
      if (last?.recommendation === 'ready' && LEVELS[l].next) return LEVELS[l].next!;
    }
    return placement?.level ?? null;
  })();

  useGhostHelp({
    screen: 'levels',
    explain: 'Wybierz poziom, od którego chcesz zacząć. Zielony jest dla osób, które nie korzystały jeszcze z AI. Poziom możesz zmienić w każdej chwili.',
    next: { text: 'Kliknij jedną z trzech kart. Jeśli nie wiesz, którą wybrać — zrób krótki test (2 minuty).', actionLabel: 'Zrób test', route: '#/test-poziomu' },
  });

  const choose = (l: LevelId) => {
    setLevel(l);
    navigate({ name: 'dashboard' });
  };

  return (
    <div className="min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => (current ? navigate({ name: 'dashboard' }) : navigate({ name: 'welcome' }))}
          className="-ml-2 mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> {current ? 'Wróć do ekranu głównego' : 'Wróć'}
        </button>
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Wybierz poziom</h1>
          <p className="mx-auto mt-3 max-w-xl text-[1.02rem] text-fg-muted">
            Możesz zacząć od dowolnego poziomu i zmienić go w każdej chwili. Żaden poziom nie jest zablokowany.
          </p>
        </div>

        <div data-tour="level-cards" className="grid gap-4 md:grid-cols-3">
          {LEVEL_ORDER.map((id, idx) => {
            const info = LEVELS[id];
            const list = lessonsForLevel(id);
            const done = list.filter((l) => lessons[l.id]?.completed).length;
            const isCurrent = current === id;
            const isSuggested = suggested === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => choose(id)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * idx, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className={cx(
                  'group relative flex flex-col overflow-hidden rounded-3xl border p-6 text-left transition',
                  isCurrent ? 'border-[color:var(--c)]' : 'border-white/10 hover:border-[color:var(--c)]',
                )}
                style={
                  {
                    '--c': info.color,
                    background: `linear-gradient(160deg, ${info.colorSoft}, rgb(255 255 255 / 0.02) 55%), rgb(14 22 41 / 0.6)`,
                    boxShadow: isCurrent ? `0 0 0 1px ${info.color}, 0 20px 50px -25px ${info.color}` : undefined,
                  } as React.CSSProperties
                }
              >
                <span className="absolute -right-10 -top-10 size-36 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: info.color }} aria-hidden="true" />
                <div className="relative flex items-start justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl border" style={{ color: info.color, borderColor: `${info.color}66`, background: `${info.color}1f` }}>
                    <Icon name={info.icon} className="size-7" />
                  </span>
                  <div className="flex flex-col items-end gap-1.5">
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                        <Check className="size-3.5" aria-hidden="true" /> Twój poziom
                      </span>
                    )}
                    {isSuggested && !isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: info.color, background: `${info.color}22` }}>
                        <Sparkles className="size-3.5" aria-hidden="true" /> Sugerowany dla Ciebie
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative mt-5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: info.color }}>
                  {info.short}
                </div>
                <h2 className="relative mt-1 font-display text-2xl font-bold">{info.name}</h2>
                <p className="relative mt-2 text-[1rem] leading-relaxed text-fg">{info.subtitle}</p>
                <p className="relative mt-3 text-sm leading-relaxed text-fg-muted">{info.audience}</p>
                <div className="relative mt-auto pt-6">
                  <div className="mb-2 flex justify-between text-xs text-fg-muted">
                    <span>
                      {list.length} lekcje · ok. {list.reduce((s, l) => s + l.minutes, 0)} min
                    </span>
                    <span>
                      Ukończone: {done}/{list.length}
                    </span>
                  </div>
                  <ProgressBar value={(done / list.length) * 100} color={info.color} size="sm" label={`Postęp poziomu ${info.name}`} />
                  <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold" style={{ color: info.color }}>
                    {isCurrent ? 'Kontynuuj ten poziom' : 'Wybierz ten poziom'} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            data-tour="placement-link"
            onClick={() => navigate({ name: 'placement' })}
            className="glass inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 text-[0.95rem] font-semibold hover:bg-white/8"
          >
            <Compass className="size-5 text-tech" aria-hidden="true" />
            Nie wiesz, od czego zacząć? Zrób krótki test (2 min)
          </button>
        </div>
      </div>
    </div>
  );
}
