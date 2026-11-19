import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, BookOpen, Compass, Cpu, Lightbulb, Loader2, Map, MessageCircleQuestion, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GLOSSARY, type GlossaryTerm } from '../../content/glossary';
import { explainTerm, ApiError } from '../../lib/api';
import { useConnectivity } from '../../lib/connectivity';
import { currentHelp, useGhost } from '../../lib/ghost';
import { navigate } from '../../lib/router';
import { useProgress } from '../../lib/store';
import { Button, cx } from '../ui';
import { GhostOrb } from './GhostOrb';

type View = 'menu' | 'explain' | 'hint' | 'next' | 'glossary' | 'term';

function PreparedTag() {
  return <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[0.7rem] font-medium text-fg-muted">Przygotowana podpowiedź · działa offline</span>;
}

function AiTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ai/40 bg-ai/12 px-2 py-0.5 text-[0.7rem] font-semibold text-ai">
      <Cpu className="size-3" aria-hidden="true" /> Odpowiedź modelu AI · wymaga Internetu
    </span>
  );
}

export function Ghost({ raised }: { raised: boolean }) {
  const { open, setOpen, startTour, entries, lift } = useGhost();
  const help = useMemo(() => currentHelp(entries), [entries]);
  const [view, setView] = useState<View>('menu');
  const [hintIndex, setHintIndex] = useState(0);
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<{ term: string; text: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const ai = useConnectivity((s) => s.online && s.ai === 'available');
  const ghostIntroShown = useProgress((s) => s.ghostIntroShown);
  const markGhostIntroShown = useProgress((s) => s.markGhostIntroShown);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const helpKey = JSON.stringify(help);
  useEffect(() => {
    setHintIndex(0);
  }, [helpKey]);

  useEffect(() => {
    if (!open) {
      setView('menu');
      setAiAnswer(null);
      setAiError(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button, input')?.focus(), 50);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus();
  }, [view]);

  const showIntroBubble = !ghostIntroShown && help?.screen === 'dashboard' && !open;

  const filtered = GLOSSARY.filter((t) => {
    const q = query.trim().toLowerCase();
    return !q || t.term.toLowerCase().includes(q) || t.short.toLowerCase().includes(q);
  });

  const askAi = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await explainTerm(q);
      setAiAnswer({ term: q, text: res.text });
    } catch (e) {
      setAiError(e instanceof ApiError ? e.message : 'Nie udało się uzyskać odpowiedzi.');
    } finally {
      setAiLoading(false);
    }
  };

  const hints = help?.hints ?? [];

  const menuItems: { id: View | 'tour'; label: string; icon: React.ReactNode }[] = [
    { id: 'tour', label: 'Pokaż mi, jak korzystać z aplikacji', icon: <Map className="size-5" /> },
    { id: 'explain', label: 'Nie rozumiem tego zadania', icon: <MessageCircleQuestion className="size-5" /> },
    { id: 'hint', label: 'Daj mi wskazówkę', icon: <Lightbulb className="size-5" /> },
    { id: 'next', label: 'Co powinienem zrobić dalej?', icon: <Compass className="size-5" /> },
    { id: 'glossary', label: 'Wyjaśnij mi to pojęcie', icon: <BookOpen className="size-5" /> },
  ];

  const back = (
    <button
      type="button"
      onClick={() => setView(view === 'term' ? 'glossary' : 'menu')}
      className="mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-fg-muted hover:bg-white/5 hover:text-fg"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Wróć
    </button>
  );

  return (
    <div
      className={cx('pointer-events-none fixed right-3 z-40 flex flex-col items-end transition-[margin] sm:right-6', raised ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-6' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6')}
      style={{ marginBottom: `${lift}rem` }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label="Duszek AI — pomoc"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="glass-strong pointer-events-auto mb-3 max-h-[min(70vh,560px)] w-[min(380px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl p-4 scrollbar-thin"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GhostOrb size={30} mood="happy" />
                <div>
                  <div className="font-display text-sm font-semibold">Duszek AI</div>
                  <div className="text-xs text-fg-muted">Jak mogę pomóc?</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
                aria-label="Zamknij pomoc"
              >
                <X className="size-5" />
              </button>
            </div>

            {view === 'menu' && (
              <div className="grid gap-2">
                {menuItems.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (m.id === 'tour') {
                        if (help?.screen) startTour(help.screen);
                        return;
                      }
                      setView(m.id);
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 text-left text-[0.95rem] font-medium text-fg transition hover:border-tech/40 hover:bg-tech/8"
                  >
                    <span className="text-tech">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">Samouczek i przygotowane podpowiedzi działają bez Internetu. Funkcje modelu AI są oznaczone fioletowo.</p>
              </div>
            )}

            {view === 'explain' && (
              <div>
                {back}
                <PreparedTag />
                <p className="mt-3 text-[0.95rem] leading-relaxed">
                  {help?.explain ?? 'Na tym ekranie nie ma zadania do wykonania. Wybierz „Co powinienem zrobić dalej?”, a podpowiem następny krok.'}
                </p>
              </div>
            )}

            {view === 'hint' && (
              <div>
                {back}
                <PreparedTag />
                {hints.length === 0 ? (
                  <p className="mt-3 text-[0.95rem] leading-relaxed">Na tym ekranie nie ma zadania z podpowiedziami. Wejdź w lekcję lub ćwiczenie w Laboratorium promptów.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {hints.slice(0, hintIndex + 1).map((h, i) => (
                      <div key={i} className="rounded-xl border border-heat/25 bg-heat/6 p-3 text-[0.95rem] leading-relaxed">
                        <span className="mr-1 font-semibold text-heat-soft">Wskazówka {i + 1}:</span>
                        {h}
                      </div>
                    ))}
                    {hintIndex < hints.length - 1 ? (
                      <Button variant="secondary" onClick={() => setHintIndex((i) => i + 1)} icon={<Lightbulb className="size-4" />}>
                        Kolejna wskazówka ({hintIndex + 2}/{hints.length})
                      </Button>
                    ) : (
                      <p className="text-xs text-fg-muted">To ostatnia wskazówka. Gotowej odpowiedzi nie podam — spróbuj samodzielnie, a potem sprawdź wynik!</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {view === 'next' && (
              <div>
                {back}
                <PreparedTag />
                <p className="mt-3 text-[0.95rem] leading-relaxed">{help?.next?.text ?? 'Wróć do ekranu głównego i kliknij „Kontynuuj naukę”.'}</p>
                {help?.next?.route && (
                  <Button
                    className="mt-3"
                    onClick={() => {
                      navigate(help.next!.route!);
                      setOpen(false);
                    }}
                  >
                    {help.next.actionLabel ?? 'Przejdź'}
                  </Button>
                )}
              </div>
            )}

            {view === 'glossary' && (
              <div>
                {back}
                <label className="relative block">
                  <span className="sr-only">Szukaj pojęcia</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                  <input
                    data-autofocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Wpisz pojęcie, np. halucynacja"
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 pl-9 pr-3 text-[0.95rem] text-fg placeholder:text-fg-subtle focus:border-tech/50 focus:outline-none"
                  />
                </label>
                <div className="mt-3 grid gap-1.5">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTerm(t);
                        setView('term');
                      }}
                      className="min-h-11 rounded-lg px-3 text-left text-[0.95rem] text-fg hover:bg-white/5"
                    >
                      {t.term}
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="px-1 text-sm text-fg-muted">Nie mam tego pojęcia w słowniku.</p>}
                </div>
                <div className="mt-4 rounded-xl border border-ai/25 bg-ai/6 p-3">
                  <div className="mb-2">
                    <AiTag />
                  </div>
                  {ai ? (
                    <>
                      <p className="text-sm text-fg-muted">Nie ma tu Twojego pojęcia? Zapytaj model AI (wpisz pojęcie w polu wyszukiwania).</p>
                      <Button
                        variant="secondary"
                        className="mt-2"
                        disabled={aiLoading || query.trim().length < 2}
                        onClick={askAi}
                        icon={aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Cpu className="size-4" />}
                      >
                        {aiLoading ? 'Model AI odpowiada…' : 'Zapytaj model AI'}
                      </Button>
                      {aiError && <p className="mt-2 text-sm text-bad">{aiError}</p>}
                      {aiAnswer && (
                        <div className="mt-3 text-[0.95rem] leading-relaxed">
                          <div className="font-semibold">{aiAnswer.term}</div>
                          <p className="mt-1 whitespace-pre-wrap">{aiAnswer.text}</p>
                          <p className="mt-2 text-xs text-fg-muted">Odpowiedź wygenerowana przez model AI — może zawierać nieścisłości.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-fg-muted">Wyjaśnienia od modelu AI są teraz niedostępne (tryb demonstracyjny lub brak Internetu). Słownik powyżej działa zawsze.</p>
                  )}
                </div>
              </div>
            )}

            {view === 'term' && term && (
              <div>
                {back}
                <PreparedTag />
                <h3 className="mt-3 font-display text-lg font-semibold">{term.term}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed">{term.short}</p>
                <div className="mt-3 rounded-xl border border-tech/25 bg-tech/6 p-3 text-[0.95rem] leading-relaxed">
                  <span className="font-semibold text-tech">Przykład: </span>
                  {term.example}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntroBubble && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-strong pointer-events-auto mb-2 flex max-w-[250px] items-end gap-2 rounded-2xl p-3 text-sm leading-snug"
            role="status"
          >
            <span>
              Cześć! Jestem <strong>Duszek AI</strong>. Kliknij mnie, gdy potrzebujesz pomocy.
            </span>
            <div className="flex shrink-0 justify-end">
              <button type="button" onClick={markGhostIntroShown} className="min-h-9 rounded-lg px-2.5 font-semibold text-tech hover:bg-tech/10">
                Rozumiem
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={buttonRef}
        type="button"
        data-tour="ghost"
        onClick={() => {
          setOpen(!open);
          if (!ghostIntroShown) markGhostIntroShown();
        }}
        aria-expanded={open}
        aria-label={open ? 'Zamknij pomoc Duszka AI' : 'Pomoc — otwórz Duszka AI'}
        className="group pointer-events-auto flex items-center gap-2 rounded-full p-1 pl-3 transition hover:bg-white/5"
      >
        <span className="glass rounded-full px-3 py-1.5 text-sm font-semibold text-fg shadow-lg">Pomoc</span>
        <span className="animate-float">
          <GhostOrb size={54} mood={open ? 'happy' : 'calm'} />
        </span>
      </button>
    </div>
  );
}
