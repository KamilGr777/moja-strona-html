import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Hand, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GhostOrb } from '../components/ghost/GhostOrb';
import { Button, cx } from '../components/ui';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';

const SLIDES = [
  {
    icon: <Hand className="size-8" aria-hidden="true" />,
    color: '#2dd4bf',
    title: 'Uczysz się przez działanie',
    text: 'Krótkie lekcje (5–8 minut): zobacz przykład, porównaj, spróbuj sam i od razu dostań informację zwrotną. Bez długich wykładów.',
  },
  {
    icon: <GhostOrb size={44} mood="happy" />,
    color: '#a78bfa',
    title: 'Duszek AI zawsze pomoże',
    text: 'W prawym dolnym rogu znajdziesz przycisk „Pomoc”. Pokaże, jak korzystać z ekranu, wyjaśni zadanie i da wskazówkę.',
  },
  {
    icon: <ShieldCheck className="size-8" aria-hidden="true" />,
    color: '#fbbf24',
    title: 'Bezpiecznie i w Twoim tempie',
    text: 'Ćwiczenia korzystają z danych fikcyjnych. Postęp zapisuje się automatycznie na tym urządzeniu. Nie musisz zakładać konta.',
  },
];

export function Intro() {
  const [i, setI] = useState(0);
  const completeIntro = useProgress((s) => s.completeIntro);
  const level = useProgress((s) => s.level);
  const finish = () => {
    completeIntro();
    navigate(level ? { name: 'dashboard' } : { name: 'levels' }, { replace: true });
  };
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  useGhostHelp({
    screen: 'intro',
    explain: 'To krótkie, opcjonalne wprowadzenie. Możesz je przeczytać („Dalej”) albo od razu pominąć („Pomiń”).',
    next: { text: 'Kliknij „Dalej” albo „Pomiń”, aby przejść do wyboru poziomu.' },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        <span className="font-display text-sm font-semibold tracking-[0.25em] text-fg-muted">TERMO AI LAB</span>
        <Button variant="ghost" data-tour="intro-skip" onClick={finish}>
          Pomiń
        </Button>
      </div>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
            <div
              className="mx-auto mb-7 grid size-20 place-items-center rounded-3xl border"
              style={{ color: slide.color, borderColor: `${slide.color}55`, background: `${slide.color}18`, boxShadow: `0 0 40px -10px ${slide.color}` }}
            >
              {slide.icon}
            </div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-fg-subtle">
              Wprowadzenie · {i + 1} z {SLIDES.length}
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{slide.title}</h1>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-fg-muted">{slide.text}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-9 flex gap-2" aria-hidden="true">
          {SLIDES.map((_, idx) => (
            <span key={idx} className={cx('h-2 rounded-full transition-all', idx === i ? 'w-7 bg-tech' : 'w-2 bg-white/20')} />
          ))}
        </div>
        <div className="mt-9 flex w-full max-w-xs flex-col gap-2">
          <Button size="lg" data-tour="intro-next" onClick={() => (last ? finish() : setI(i + 1))} iconRight={<ArrowRight className="size-5" aria-hidden="true" />} block>
            {last ? 'Wybierz poziom' : 'Dalej'}
          </Button>
          {i > 0 && (
            <Button variant="ghost" onClick={() => setI(i - 1)} block>
              Wstecz
            </Button>
          )}
        </div>
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-fg-subtle">
          <Sparkles className="size-4" aria-hidden="true" /> Prompt to polecenie lub instrukcja dla AI — tego słowa będziemy używać.
        </p>
      </main>
    </div>
  );
}
