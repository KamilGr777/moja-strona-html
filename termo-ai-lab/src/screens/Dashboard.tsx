import { motion } from 'motion/react';
import { ArrowRight, BookOpen, ClipboardCheck, FlaskConical, Lightbulb, Play, Star, Trophy } from 'lucide-react';
import { Button, Card, Icon, LevelPill, ProgressBar, cx } from '../components/ui';
import { BADGES } from '../content/badges';
import { lessonsForLevel } from '../content/lessons';
import { LEVELS, SKILL_ORDER, SKILLS } from '../content/levels';
import { getAdaptiveTip, nextLessonFor } from '../lib/adaptive';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { skillScore, useProgress } from '../lib/store';

export function Dashboard() {
  const state = useProgress();
  const level = state.level ?? 'poczatkujacy';
  const info = LEVELS[level];
  const list = lessonsForLevel(level);
  const done = list.filter((l) => state.lessons[l.id]?.completed).length;
  const next = nextLessonFor(state, level);
  const tip = getAdaptiveTip(state);
  const badgeCount = Object.keys(state.badges).length;
  const lastAssessment = state.assessments[level]?.[state.assessments[level]!.length - 1];
  const skills = SKILL_ORDER.map((s) => ({ s, v: skillScore(state.skillEvents, s) })).filter((x) => x.v);

  const nextProgress = next ? state.lessons[next.lesson.id] : undefined;
  const stepsTotal = next?.lesson.steps.length ?? 0;

  useGhostHelp({
    screen: 'dashboard',
    explain: 'To Twój ekran główny. Najważniejszy jest duży przycisk „Kontynuuj naukę” — zawsze prowadzi do następnej lekcji.',
    next: next
      ? { text: `Proponuję lekcję „${next.lesson.title}”. Kliknij „${next.resume ? 'Kontynuuj' : 'Zacznij lekcję'}” w dużej karcie.`, actionLabel: 'Przejdź do lekcji', route: `#/lekcja/${next.lesson.id}` }
      : { text: 'Ukończyłeś wszystkie lekcje tego poziomu! Sprawdź swoją gotowość w „Oceń moje osiągnięcia”.', actionLabel: 'Oceń moje osiągnięcia', route: `#/sprawdzian/${level}` },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-fg-muted">TERMO AI LAB</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl" tabIndex={-1} data-page-title>
            Gotowy na kolejne odkrycie?
          </h1>
        </div>
        <button type="button" data-tour="level-chip" onClick={() => navigate({ name: 'levels' })} className="inline-flex min-h-10 items-center gap-2 rounded-full" aria-label={`Twój poziom: ${info.name}. Kliknij, aby zmienić`}>
          <LevelPill level={level} />
          <span className="text-xs text-fg-muted underline-offset-2 hover:underline">zmień</span>
        </button>
      </div>

      {/* Kontynuuj naukę — najważniejszy element */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div
          data-tour="continue-card"
          className="relative overflow-hidden rounded-3xl border p-6 sm:p-8"
          style={{ borderColor: `${info.color}55`, background: `linear-gradient(135deg, ${info.colorSoft}, rgb(139 92 246 / 0.10) 60%, rgb(14 22 41 / 0.6))` }}
        >
          <div className="absolute -right-16 -top-16 size-56 rounded-full opacity-25 blur-3xl" style={{ background: info.color }} aria-hidden="true" />
          {next ? (
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl border" style={{ color: info.color, borderColor: `${info.color}66`, background: `${info.color}1f` }}>
                <Icon name={next.lesson.icon} className="size-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: info.color }}>
                  {next.resume ? 'Kontynuuj naukę' : 'Następna lekcja'} · Lekcja {next.lesson.number}
                </div>
                <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">{next.lesson.title}</h2>
                <p className="mt-1 text-[0.97rem] text-fg-muted">{next.lesson.subtitle}</p>
                <div className="mt-3 text-sm text-fg-muted">
                  {next.resume && nextProgress ? `Krok ${nextProgress.stepIndex + 1} z ${stepsTotal}` : `ok. ${next.lesson.minutes} minut · ${stepsTotal} kroków`}
                </div>
              </div>
              <Button size="lg" variant="level" onClick={() => navigate({ name: 'lesson', id: next.lesson.id })} icon={<Play className="size-5" aria-hidden="true" />}>
                {next.resume ? 'Kontynuuj' : 'Zacznij lekcję'}
              </Button>
            </div>
          ) : (
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <Trophy className="size-12 shrink-0" style={{ color: info.color }} aria-hidden="true" />
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold">Wszystkie lekcje poziomu ukończone!</h2>
                <p className="mt-1 text-fg-muted">Sprawdź, czy jesteś gotowy na kolejny poziom, albo ćwicz w Laboratorium promptów.</p>
              </div>
              <Button size="lg" variant="level" onClick={() => navigate({ name: 'assessment', level })}>
                Oceń moje osiągnięcia
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Postęp */}
      <div data-tour="progress-summary" className="mt-5 grid gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">Postęp poziomu {info.name.toLowerCase()}</span>
            <span className="text-fg-muted">
              {done} z {list.length} lekcji
            </span>
          </div>
          <ProgressBar value={(done / list.length) * 100} label="Ukończone lekcje" />
        </div>
        <div className="flex gap-5 text-sm">
          <button type="button" onClick={() => navigate({ name: 'progress' })} className="flex items-center gap-2 rounded-lg px-1 hover:text-fg">
            <Star className="size-5 text-heat-soft" aria-hidden="true" />
            <span>
              <strong className="block text-base tabular-nums">{state.points}</strong>
              <span className="text-fg-muted">punktów</span>
            </span>
          </button>
          <button type="button" onClick={() => navigate({ name: 'progress' })} className="flex items-center gap-2 rounded-lg px-1 hover:text-fg">
            <Trophy className="size-5 text-ai" aria-hidden="true" />
            <span>
              <strong className="block text-base tabular-nums">
                {badgeCount}/{BADGES.length}
              </strong>
              <span className="text-fg-muted">odznak</span>
            </span>
          </button>
        </div>
      </div>

      {/* Dwie główne akcje dodatkowe */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <button type="button" data-tour="lab-card" onClick={() => navigate({ name: 'lab' })} className="glass group rounded-3xl p-5 text-left transition hover:bg-white/8 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-tech/15 text-tech">
              <FlaskConical className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Laboratorium promptów</h2>
              <p className="text-sm text-fg-muted">Ćwiczenia praktyczne z oceną i wskazówkami</p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-tech">
            Ćwicz teraz <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
        <button type="button" data-tour="assessment-card" onClick={() => navigate({ name: 'assessment', level })} className="glass group rounded-3xl p-5 text-left transition hover:bg-white/8 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-ai/15 text-ai">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Oceń moje osiągnięcia</h2>
              <p className="text-sm text-fg-muted">
                {lastAssessment ? `Ostatni wynik gotowości: ${lastAssessment.score}/100` : 'Sprawdź gotowość do kolejnego poziomu'}
              </p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ai">
            {lastAssessment ? 'Sprawdź ponownie' : 'Rozpocznij sprawdzian'} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
      </div>

      {/* Sugestia adaptacyjna */}
      {tip && (
        <Card className="mt-5 border-heat/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Lightbulb className="size-7 shrink-0 text-heat-soft" aria-hidden="true" />
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-heat-soft">{tip.kind === 'collect' ? 'Wskazówka' : 'Sugestia na podstawie Twoich ostatnich ćwiczeń'}</div>
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

      {/* Umiejętności i biblioteka */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold">Moje umiejętności</h2>
            <button type="button" onClick={() => navigate({ name: 'progress' })} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-tech hover:bg-tech/10">
              Szczegóły
            </button>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-fg-muted">Po pierwszych ćwiczeniach zobaczysz tu, w czym jesteś mocny, a co warto poćwiczyć.</p>
          ) : (
            <ul className="grid gap-3">
              {skills.slice(0, 4).map(({ s, v }) => (
                <li key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{SKILLS[s].label}</span>
                    <span className="tabular-nums text-fg-muted">{v!.value}%</span>
                  </div>
                  <ProgressBar value={v!.value} size="sm" label={SKILLS[s].label} color={v!.value >= 80 ? '#34d399' : v!.value >= 55 ? '#2dd4bf' : '#fbbf24'} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <button type="button" onClick={() => navigate({ name: 'library' })} className="glass group rounded-[var(--radius-card)] p-5 text-left transition hover:bg-white/8 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-heat/15 text-heat-soft">
              <BookOpen className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display font-semibold">Biblioteka promptów</h2>
              <p className="text-sm text-fg-muted">Gotowe instrukcje do codziennej pracy — uzupełnij i skopiuj</p>
            </div>
          </div>
          <span className={cx('mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-heat-soft')}>
            Otwórz bibliotekę <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  );
}
