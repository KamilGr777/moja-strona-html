import { motion } from 'motion/react';
import { ArrowRight, Layers, Play } from 'lucide-react';
import { NetworkBackground } from '../components/NetworkBackground';
import { Button } from '../components/ui';
import { getLesson } from '../content/lessons';
import { LEVELS } from '../content/levels';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';

export function Welcome() {
  const { introSeen, level, lastLessonId, lessons } = useProgress();
  const last = lastLessonId ? getLesson(lastLessonId) : undefined;
  const lastProgress = last ? lessons[last.id] : undefined;
  const resumable = last && lastProgress && !lastProgress.completed;
  const returning = !!level;

  const start = () => {
    if (!introSeen) navigate({ name: 'intro' });
    else if (!level) navigate({ name: 'levels' });
    else navigate({ name: 'dashboard' });
  };

  useGhostHelp({
    screen: 'welcome',
    explain: 'To ekran powitalny aplikacji TERMO AI LAB. Kliknij duży napis albo przycisk „Rozpocznij”, aby zacząć naukę.',
    next: { text: returning ? 'Kliknij „Kontynuuj naukę”, aby wrócić tam, gdzie skończyłeś.' : 'Kliknij „Rozpocznij” — pokażę krótkie wprowadzenie, a potem wybierzesz poziom.', actionLabel: returning ? 'Kontynuuj naukę' : 'Rozpocznij', route: returning ? '#/start' : introSeen ? '#/poziomy' : '#/wprowadzenie' },
  });

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <NetworkBackground />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 55% at 50% 48%, rgb(7 11 24 / 0.2), rgb(7 11 24 / 0.85) 75%)' }}
        aria-hidden="true"
      />
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-7 flex items-center gap-3">
          <img src="./favicon.svg" alt="" className="size-10 drop-shadow-[0_0_14px_rgb(45_212_191/0.6)]" />
          <span className="font-display text-sm font-semibold tracking-[0.32em] text-fg-muted">TERMO AI LAB</span>
        </motion.div>

        <motion.button
          type="button"
          onClick={start}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="group relative rounded-3xl px-2 py-1"
          aria-label="Interaktywna Akademia Sztucznej Inteligencji — kliknij, aby rozpocząć"
        >
          <h1 className="text-gradient-brand font-display text-[2.1rem] font-bold uppercase leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Interaktywna Akademia
            <br />
            Sztucznej Inteligencji
          </h1>
          <span
            className="absolute inset-x-10 -bottom-3 h-px opacity-60 transition group-hover:opacity-100"
            style={{ background: 'linear-gradient(90deg, transparent, #2dd4bf, #a78bfa, #fbbf24, transparent)' }}
            aria-hidden="true"
          />
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-8 max-w-2xl text-lg text-fg-muted sm:text-xl"
        >
          Twoje doświadczenie zawodowe. <span className="text-fg">Nowe możliwości dzięki AI.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 flex w-full max-w-sm flex-col gap-3"
        >
          <Button size="lg" data-tour="start-button" onClick={start} iconRight={<ArrowRight className="size-5" aria-hidden="true" />} block>
            {returning ? 'Kontynuuj naukę' : 'Rozpocznij'}
          </Button>
          {resumable && last && (
            <Button variant="secondary" onClick={() => navigate({ name: 'lesson', id: last.id })} icon={<Play className="size-4" aria-hidden="true" />} block>
              Wróć do lekcji: {last.title}
            </Button>
          )}
          {returning && (
            <Button variant="ghost" onClick={() => navigate({ name: 'levels' })} icon={<Layers className="size-4" aria-hidden="true" />} block>
              Zmień poziom ({LEVELS[level].name.toLowerCase()})
            </Button>
          )}
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-10 max-w-md text-sm text-fg-subtle">
          Bez zakładania konta. Twoje postępy zapisują się na tym urządzeniu. Wszystkie ćwiczenia korzystają z danych fikcyjnych.
        </motion.p>
      </main>
    </div>
  );
}
