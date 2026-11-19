import { BookOpen, Cpu, FlaskConical, GraduationCap, House, Settings, Trophy, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { LEVELS } from '../../content/levels';
import { useConnectivity } from '../../lib/connectivity';
import { navigate, useRoute, type Route } from '../../lib/router';
import { useProgress } from '../../lib/store';
import { cx, LevelPill } from '../ui';

const NAV: { route: Route; label: string; short: string; icon: typeof House; match: Route['name'][] }[] = [
  { route: { name: 'dashboard' }, label: 'Start', short: 'Start', icon: House, match: ['dashboard'] },
  { route: { name: 'lessons' }, label: 'Lekcje', short: 'Lekcje', icon: GraduationCap, match: ['lessons', 'lesson', 'assessment'] },
  { route: { name: 'lab' }, label: 'Laboratorium', short: 'Laboratorium', icon: FlaskConical, match: ['lab', 'labTask'] },
  { route: { name: 'library' }, label: 'Biblioteka', short: 'Biblioteka', icon: BookOpen, match: ['library', 'libraryItem'] },
  { route: { name: 'progress' }, label: 'Postępy', short: 'Postępy', icon: Trophy, match: ['progress'] },
];

export function AiStatusChip() {
  const { online, ai } = useConnectivity();
  if (!online) {
    return (
      <button
        type="button"
        data-tour="ai-status"
        onClick={() => navigate({ name: 'settings' })}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-xs font-semibold text-fg-muted"
        title="Brak połączenia z Internetem — lekcje działają offline, funkcje AI są niedostępne."
      >
        <WifiOff className="size-3.5" aria-hidden="true" /> Offline
      </button>
    );
  }
  const isAi = ai === 'available';
  return (
    <button
      type="button"
      data-tour="ai-status"
      onClick={() => navigate({ name: 'settings' })}
      className={cx(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
        isAi ? 'border-ai/40 bg-ai/12 text-ai' : 'border-warn/35 bg-warn/8 text-warn',
      )}
      title={isAi ? 'Ocena promptów korzysta z modelu AI.' : 'Model AI nie jest skonfigurowany — działa tryb demonstracyjny.'}
    >
      {isAi ? <Cpu className="size-3.5" aria-hidden="true" /> : <FlaskConical className="size-3.5" aria-hidden="true" />}
      {ai === 'checking' ? 'Sprawdzam AI…' : isAi ? 'AI połączona' : 'Tryb demo'}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const level = useProgress((s) => s.level);

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink-800 focus:px-4 focus:py-2">
        Przejdź do treści
      </a>

      {/* Pasek boczny — komputer */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/6 bg-ink-950/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <button type="button" onClick={() => navigate({ name: 'dashboard' })} className="mb-8 flex items-center gap-3 rounded-xl px-2 text-left">
          <img src="./favicon.svg" alt="" className="size-9" />
          <div>
            <div className="font-display text-[0.95rem] font-bold tracking-wide">TERMO AI LAB</div>
            <div className="text-xs text-fg-muted">Akademia AI</div>
          </div>
        </button>
        <nav aria-label="Menu główne" data-tour="main-nav" className="grid gap-1">
          {NAV.map((item) => {
            const active = item.match.includes(route.name);
            const I = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.route)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition',
                  active ? 'bg-white/8 text-fg shadow-[inset_3px_0_0_var(--level-color)]' : 'text-fg-muted hover:bg-white/5 hover:text-fg',
                )}
              >
                <I className="size-5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-3">
          {level && (
            <button type="button" onClick={() => navigate({ name: 'levels' })} className="rounded-xl border border-white/8 p-3 text-left hover:bg-white/5">
              <div className="text-xs text-fg-muted">Twój poziom</div>
              <div className="mt-1 font-semibold" style={{ color: LEVELS[level].color }}>
                {LEVELS[level].name}
              </div>
              <div className="mt-0.5 text-xs text-fg-subtle">Kliknij, aby zmienić</div>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate({ name: 'settings' })}
            className={cx('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm', route.name === 'settings' ? 'bg-white/8 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg')}
          >
            <Settings className="size-4" aria-hidden="true" /> Ustawienia i instalacja
          </button>
        </div>
      </aside>

      {/* Górny pasek */}
      <header className="sticky top-0 z-20 border-b border-white/6 bg-ink-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => navigate({ name: 'dashboard' })} className="flex items-center gap-2 lg:hidden" aria-label="TERMO AI LAB — ekran główny">
            <img src="./favicon.svg" alt="" className="size-7" />
            <span className="font-display text-sm font-bold tracking-wide">TERMO AI LAB</span>
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            {level && (
              <button type="button" onClick={() => navigate({ name: 'levels' })} aria-label={`Poziom: ${LEVELS[level].name}. Zmień poziom`} className="hidden sm:block lg:hidden">
                <LevelPill level={level} />
              </button>
            )}
            <AiStatusChip />
            <button
              type="button"
              onClick={() => navigate({ name: 'settings' })}
              className="grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-white/5 hover:text-fg lg:hidden"
              aria-label="Ustawienia i instalacja"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 pb-36 pt-6 sm:px-6 lg:pb-16">
        {children}
      </main>

      {/* Dolna nawigacja — telefon i tablet */}
      <nav aria-label="Menu główne" data-tour="main-nav" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-ink-950/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((item) => {
            const active = item.match.includes(route.name);
            const I = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.route)}
                aria-current={active ? 'page' : undefined}
                className={cx('flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium', active ? 'text-fg' : 'text-fg-subtle')}
              >
                <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', active && 'bg-white/10')}>
                  <I className="size-5" style={active ? { color: 'var(--level-color)' } : undefined} aria-hidden="true" />
                </span>
                {item.short}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Nagłówek ekranu z wyraźnym przyciskiem powrotu. */
export function PageHeader({
  title,
  subtitle,
  back,
  backLabel = 'Wróć',
  right,
  tourId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: Route;
  backLabel?: string;
  right?: ReactNode;
  tourId?: string;
}) {
  return (
    <div className="mb-6">
      {back && (
        <button
          type="button"
          data-tour={tourId}
          onClick={() => navigate(back)}
          className="-ml-2 mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
        >
          <span aria-hidden="true">←</span> {backLabel}
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl" tabIndex={-1} data-page-title>
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-[0.95rem] text-fg-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

/**
 * Pasek akcji przyklejony do dołu ekranu (lekcja, sprawdzian) — zawsze w tym samym miejscu,
 * nad dolną nawigacją na telefonie. Duszek AI jest wtedy unoszony nad pasek.
 */
export function ActionBar({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <>
      <div className="h-28" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 lg:bottom-0 lg:left-64">
        <div className="mx-auto max-w-5xl px-3 pb-2 sm:px-6 lg:pb-4">
          <div className="glass-strong rounded-2xl p-2.5">
            {hint && (
              <p className="px-2 pb-1.5 text-center text-xs text-fg-muted sm:text-right" role="status">
                {hint}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
