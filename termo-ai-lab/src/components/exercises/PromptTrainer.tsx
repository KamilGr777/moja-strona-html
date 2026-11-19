import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, CircleDashed, Cpu, FileText, Info, Lightbulb, Loader2, Minus, Pencil, Play, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ExerciseResult, PromptTask, ReferenceFact } from '../../content/types';
import { ApiError, evaluateWithAI, runPrompt } from '../../lib/api';
import { useConnectivity } from '../../lib/connectivity';
import { evaluateDemo } from '../../lib/demoEvaluator';
import { pointsFor, scoreBand, skillScoresFromCriteria, type Evaluation } from '../../lib/scoring';
import { useProgress } from '../../lib/store';
import { wordCount } from '../../lib/text';
import { toast } from '../../lib/toast';
import { Button, Callout, CopyButton, cx, ModeBadge, PromptBlock, ScoreRing } from '../ui';
import type { Phase } from './common';

interface Props {
  task: PromptTask;
  context: 'lesson' | 'lab' | 'assessment';
  onResult?: (r: ExerciseResult) => void;
  onPhase?: (p: Phase) => void;
  /** Wyświetl nagłówek z tytułem zadania (w Laboratorium tytuł jest w nagłówku strony). */
  showTitle?: boolean;
}

function LevelIcon({ level }: { level: 0 | 0.5 | 1 }) {
  if (level === 1)
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok/18 text-ok" role="img" aria-label="Spełnione">
        <Check className="size-4" />
      </span>
    );
  if (level === 0.5)
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/18 text-warn" role="img" aria-label="Częściowo">
        <Minus className="size-4" />
      </span>
    );
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bad/18 text-bad" role="img" aria-label="Brak">
      <X className="size-4" />
    </span>
  );
}

function findFact(output: string, fact: ReferenceFact): boolean {
  const norm = output.replace(/ /g, ' ');
  const candidates = [fact.value, ...(fact.alternatives ?? [])];
  return candidates.some((c) => {
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\d,.])${esc}([^\\d]|$)`).test(norm);
  });
}

export function PromptTrainer({ task, context, onResult, onPhase, showTitle = true }: Props) {
  const assessment = context === 'assessment';
  const draftKey = `${context}:${task.id}`;
  const draft = useProgress((s) => s.drafts[draftKey]);
  const saveDraft = useProgress((s) => s.saveDraft);
  const recordTrainerAttempt = useProgress((s) => s.recordTrainerAttempt);
  const ai = useConnectivity((s) => s.online && s.ai === 'available');

  const [text, setText] = useState(draft ?? '');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [editedSinceCheck, setEditedSinceCheck] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [run, setRun] = useState<{ loading: boolean; output?: string; error?: string }>({ loading: false });
  const [attach, setAttach] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(draftKey, text), 400);
    return () => window.clearTimeout(t);
  }, [text, draftKey, saveDraft]);

  const words = wordCount(text);
  const canCheck = text.trim().length >= 3 && !loading && !(assessment && evaluation);

  const check = async () => {
    if (!canCheck) return;
    setLoading(true);
    setFallbackNote(null);
    let ev: Evaluation;
    if (ai) {
      try {
        ev = await evaluateWithAI(task.id, text);
      } catch (e) {
        ev = evaluateDemo(task, text);
        setFallbackNote(`${e instanceof ApiError ? e.message : 'Nie udało się połączyć z modelem AI.'} Pokazuję ocenę demonstracyjną.`);
      }
    } else {
      ev = evaluateDemo(task, text);
    }
    setLoading(false);
    setEvaluation(ev);
    setHistory((h) => [...h, ev.score]);
    setEditedSinceCheck(false);
    setRun({ loading: false });
    onPhase?.('feedback');
    const { improvement, pointsAwarded } = recordTrainerAttempt({
      taskId: task.id,
      score: ev.score,
      mode: ev.mode,
      context,
      criteria: ev.criteria.map((c) => ({ id: c.id, level: c.level, skill: task.criteria.find((x) => x.id === c.id)!.skill })),
    });
    if (!assessment && improvement !== null && improvement > 0) {
      toast({ title: `+${improvement} pkt względem poprzedniej próby`, text: 'Tak właśnie pracuje się z AI — poprawiając polecenie.', tone: 'success' });
    } else if (!assessment && pointsAwarded > 0 && history.length === 0) {
      toast({ title: `+${pointsAwarded} punktów doświadczenia`, tone: 'info' }, 2500);
    }
    onResult?.({ score: ev.score, skills: skillScoresFromCriteria(task, ev.criteria) });
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const runInAi = async () => {
    setRun({ loading: true });
    try {
      const res = await runPrompt(task.id, text, attach);
      setRun({ loading: false, output: res.output });
    } catch (e) {
      setRun({ loading: false, error: e instanceof ApiError ? e.message : 'Nie udało się uruchomić polecenia.' });
    }
  };

  const band = evaluation ? scoreBand(evaluation.score) : null;
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const attachable = (task.materials ?? []).filter((m) => m.attachToRun);

  return (
    <div>
      {showTitle && (
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--level-color)]">
            {task.kind === 'fix' ? 'Napraw nieudany prompt' : 'Trenażer promptów'}
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{task.title}</h2>
        </div>
      )}

      {/* Zadanie */}
      <div data-tour="task-card" className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
        <p className="text-[1.02rem] leading-relaxed">{task.scenario}</p>
        {task.brokenPrompt && (
          <div className="mt-4">
            <div className="mb-1.5 text-sm font-semibold text-bad">Nieudane polecenie do poprawienia:</div>
            <PromptBlock tone="bad">{task.brokenPrompt}</PromptBlock>
          </div>
        )}
        {task.materials?.map((m) => (
          <details key={m.title} className="group mt-4 rounded-xl border border-sky/20 bg-sky/[0.04]" open={!task.brokenPrompt || context !== 'lab'}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-semibold text-sky">
              <span className="inline-flex items-center gap-2">
                <FileText className="size-4" aria-hidden="true" /> {m.title}
              </span>
              <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="px-4 pb-4">
              <p className="prompt-text max-h-64 overflow-auto text-[0.92rem] leading-relaxed text-fg scrollbar-thin">{m.content}</p>
              {m.copyable && (
                <div className="mt-3">
                  <CopyButton text={m.content} label="Kopiuj materiał" />
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {/* Pole promptu */}
      <div className="mt-5">
        <label htmlFor={`prompt-${task.id}`} className="mb-2 block font-semibold">
          {task.kind === 'fix' ? 'Napisz tutaj poprawione polecenie' : 'Napisz tutaj swój prompt'}
        </label>
        <textarea
          id={`prompt-${task.id}`}
          ref={inputRef}
          data-tour="prompt-input"
          value={text}
          readOnly={assessment && !!evaluation}
          onChange={(e) => {
            setText(e.target.value);
            if (evaluation && !editedSinceCheck) {
              setEditedSinceCheck(true);
              onPhase?.('improve');
            }
          }}
          placeholder={task.placeholder}
          rows={7}
          className="min-h-44 w-full resize-y rounded-2xl border border-white/12 bg-ink-950/70 p-4 text-[1rem] leading-relaxed text-fg shadow-inner placeholder:text-fg-subtle focus:border-[var(--level-color)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--level-color)_35%,transparent)]"
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <span>
            {words} {words === 1 ? 'słowo' : words % 10 >= 2 && words % 10 <= 4 && (words % 100 < 10 || words % 100 >= 20) ? 'słowa' : 'słów'} · szkic zapisuje się automatycznie
          </span>
          <span>Nie wpisuj prawdziwych danych osobowych ani poufnych informacji.</span>
        </div>
      </div>

      {/* Podpowiedzi */}
      {!assessment && (
        <div className="mt-3">
          {hintCount > 0 && (
            <div className="mb-3 grid gap-2">
              {task.hints.slice(0, hintCount).map((h, i) => (
                <div key={i} className="rounded-xl border border-heat/25 bg-heat/6 px-3.5 py-2.5 text-[0.95rem]">
                  <span className="mr-1 font-semibold text-heat-soft">Wskazówka {i + 1}:</span>
                  {h}
                </div>
              ))}
            </div>
          )}
          {hintCount < task.hints.length && (
            <button type="button" onClick={() => setHintCount((c) => c + 1)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-heat-soft hover:bg-heat/10">
              <Lightbulb className="size-4" aria-hidden="true" />
              {hintCount === 0 ? 'Potrzebujesz podpowiedzi?' : `Kolejna wskazówka (${hintCount + 1}/${task.hints.length})`}
            </button>
          )}
        </div>
      )}

      {/* Akcja */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          data-tour="check-button"
          variant="level"
          size="lg"
          onClick={check}
          disabled={!canCheck}
          icon={loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}
        >
          {loading ? (ai ? 'Model AI ocenia…' : 'Oceniam…') : assessment ? 'Zatwierdź odpowiedź' : evaluation ? 'Sprawdź ponownie' : 'Sprawdź mój prompt'}
        </Button>
        <button
          type="button"
          data-tour="eval-mode"
          onClick={() => setShowModeInfo((v) => !v)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-left"
          aria-expanded={showModeInfo}
        >
          <ModeBadge mode={ai ? 'ai' : 'demo'} />
          <Info className="size-4 text-fg-subtle" aria-hidden="true" />
          <span className="sr-only">Wyjaśnij tryb oceny</span>
        </button>
      </div>
      <AnimatePresence>
        {showModeInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-fg-muted">
              {ai ? (
                <>
                  <strong className="text-ai">Ocena modelu AI:</strong> model językowy ocenia sens Twojego polecenia według kryteriów tego ćwiczenia (brak / częściowo / spełnione) i uzasadnia ocenę. Liczba punktów wynika z wag kryteriów. Wymaga Internetu.
                </>
              ) : (
                <>
                  <strong className="text-warn">Tryb demonstracyjny:</strong> model AI nie jest skonfigurowany (lub brak Internetu). Ocena opiera się na prostych regułach, które szukają w tekście sygnałów wymaganych elementów (np. odbiorca, termin, forma). Nie rozumie treści jak model AI — może przeoczyć dobre sformułowanie lub nagrodzić przypadkowe słowo. Traktuj ją jako orientacyjną.
                </>
              )}
              <span className="mt-2 block">
                W obu trybach wynik to <strong className="text-fg">szacunkowa ocena jakości polecenia</strong> według kryteriów ćwiczenia — nie gwarancja, że odpowiedź AI będzie poprawna.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wynik */}
      <div ref={resultRef} className="scroll-mt-20">
        <AnimatePresence mode="wait">
          {evaluation && band && (
            <motion.section
              key={history.length}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              aria-label="Informacja zwrotna"
              aria-live="polite"
              className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-6"
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--level-color)]">Informacja zwrotna</div>
              {fallbackNote && (
                <div className="mb-3">
                  <Callout tone="warn">{fallbackNote}</Callout>
                </div>
              )}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ScoreRing score={evaluation.score} />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ModeBadge mode={evaluation.mode} model={evaluation.model} />
                    {prev !== null && (
                      <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', evaluation.score - prev > 0 ? 'bg-ok/15 text-ok' : evaluation.score - prev < 0 ? 'bg-bad/15 text-bad' : 'bg-white/8 text-fg-muted')}>
                        {evaluation.score - prev > 0 ? '+' : ''}
                        {evaluation.score - prev} pkt względem poprzedniej próby
                      </span>
                    )}
                  </div>
                  <p className="text-[1.05rem] leading-relaxed text-fg">{evaluation.summary}</p>
                  <p className="mt-2 text-xs text-fg-subtle">
                    Wynik szacunkowy według kryteriów tego ćwiczenia — nie gwarantuje poprawności odpowiedzi AI.
                  </p>
                </div>
              </div>

              {evaluation.warnings.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {evaluation.warnings.map((w) => (
                    <Callout key={w} tone="warn">
                      {w}
                    </Callout>
                  ))}
                </div>
              )}

              {/* Kryteria */}
              <div className="mt-5">
                <h3 className="mb-2 font-semibold">Ocena według kryteriów</h3>
                <ul className="grid gap-2">
                  {evaluation.criteria.map((c) => {
                    const def = task.criteria.find((x) => x.id === c.id)!;
                    const p = pointsFor(task, c.id, c.level);
                    return (
                      <li key={c.id} className="flex gap-3 rounded-xl border border-white/8 bg-ink-950/40 p-3">
                        <LevelIcon level={c.level} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="font-semibold">{def.label}</span>
                            <span className="text-sm tabular-nums text-fg-muted">
                              {p.got}/{p.max} pkt
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{c.comment}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {!assessment && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 font-semibold text-ok">Co zrobiłeś dobrze</h3>
                    {evaluation.strengths.length ? (
                      <ul className="grid gap-1.5 text-[0.95rem]">
                        {evaluation.strengths.map((s) => (
                          <li key={s} className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" /> {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[0.95rem] text-fg-muted">Dopiero zaczynamy — skorzystaj ze wskazówek obok.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-heat-soft">Czego brakuje i jak to poprawić</h3>
                    {evaluation.improvements.length ? (
                      <ul className="grid gap-1.5 text-[0.95rem]">
                        {evaluation.improvements.map((s) => (
                          <li key={s} className="flex gap-2">
                            <Pencil className="mt-0.5 size-4 shrink-0 text-heat-soft" aria-hidden="true" /> {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[0.95rem] text-fg-muted">Nic istotnego — świetna robota!</p>
                    )}
                  </div>
                </div>
              )}

              {!assessment && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    icon={<Pencil className="size-4" aria-hidden="true" />}
                    onClick={() => {
                      onPhase?.('improve');
                      inputRef.current?.focus();
                      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    Popraw swój prompt
                  </Button>
                  <Button variant="ghost" onClick={() => setShowExample((v) => !v)} aria-expanded={showExample} icon={<CircleDashed className="size-4" aria-hidden="true" />}>
                    {showExample ? 'Ukryj przykład' : 'Pokaż przykładową lepszą instrukcję'}
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {showExample && !assessment && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-4 grid gap-4">
                      {evaluation.improvedPrompt && (
                        <div>
                          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ai">
                            <Cpu className="size-4" aria-hidden="true" /> Twoja instrukcja ulepszona przez model AI
                          </div>
                          <PromptBlock>{evaluation.improvedPrompt}</PromptBlock>
                        </div>
                      )}
                      <div>
                        <div className="mb-1.5 text-sm font-semibold text-ok">Przykładowa lepsza instrukcja (przygotowana przez autorów kursu)</div>
                        <PromptBlock tone="good">{task.examplePrompt}</PromptBlock>
                        <ul className="mt-2 grid gap-1 text-sm text-fg-muted">
                          {task.exampleWhy.map((w) => (
                            <li key={w}>• {w}</li>
                          ))}
                        </ul>
                        <div className="mt-3">
                          <CopyButton text={task.examplePrompt} label="Kopiuj przykład" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5">
                <Callout tone="info">
                  <strong>Jak sprawdzić wynik od AI: </strong>
                  {task.verifyTip}
                </Callout>
              </div>

              {/* Uruchom w AI */}
              {!assessment && (
                <div className="mt-5 rounded-2xl border border-ai/25 bg-ai/[0.05] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 font-semibold text-ai">
                      <Cpu className="size-4" aria-hidden="true" /> Zobacz, co odpowie AI na Twój prompt
                    </div>
                    <span className="text-xs text-fg-muted">Wymaga Internetu i skonfigurowanego modelu AI</span>
                  </div>
                  {ai ? (
                    <>
                      {attachable.length > 0 && (
                        <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="size-4 accent-[var(--color-ai)]" />
                          Dołącz materiały z zadania ({attachable.map((m) => m.title).join(', ')})
                        </label>
                      )}
                      <Button
                        className="mt-3"
                        variant="secondary"
                        onClick={runInAi}
                        disabled={run.loading}
                        icon={run.loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                      >
                        {run.loading ? 'Model AI pisze odpowiedź…' : 'Uruchom mój prompt w AI'}
                      </Button>
                      {run.error && <p className="mt-2 text-sm text-bad">{run.error}</p>}
                      {run.output && (
                        <div className="mt-4">
                          <div className="mb-1.5 text-sm font-semibold">Odpowiedź modelu AI — sprawdź ją krytycznie:</div>
                          <div className="prompt-text max-h-96 overflow-auto rounded-xl border border-white/10 bg-ink-950/60 p-4 text-[0.95rem] leading-relaxed scrollbar-thin">{run.output}</div>
                          {task.referenceFacts && (
                            <div className="mt-4 rounded-xl border border-sky/25 bg-sky/[0.05] p-4">
                              <div className="mb-2 text-sm font-semibold text-sky">Porównanie z wartościami źródłowymi</div>
                              <ul className="grid gap-1.5 text-sm">
                                {task.referenceFacts.map((f) => {
                                  const found = findFact(run.output!, f);
                                  return (
                                    <li key={f.label} className="flex items-start gap-2">
                                      {found ? <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />}
                                      <span>
                                        {f.label}: <strong>{f.value} {f.unit}</strong> —{' '}
                                        <span className="text-fg-muted">{found ? 'ta wartość występuje w odpowiedzi (sprawdź, czy w dobrym miejscu).' : 'nie znaleziono tej wartości w odpowiedzi — sprawdź ręcznie.'}</span>
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                              <p className="mt-2 text-xs text-fg-muted">Porównanie wyszukuje liczby w tekście — nie ocenia kontekstu. Ostateczną weryfikację wykonujesz Ty.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-fg-muted">
                      Model AI nie jest teraz dostępny w tej aplikacji. Skopiuj swój prompt i materiały do asystenta AI dopuszczonego w Twojej firmie, a odpowiedź porównaj z danymi z zadania.
                    </p>
                  )}
                  {ai && <p className="mt-3 text-xs text-fg-muted">Wysyłasz treść do zewnętrznego modelu AI — używaj tylko danych fikcyjnych z ćwiczenia.</p>}
                </div>
              )}

              {history.length > 1 && !assessment && (
                <div className="mt-5 text-sm text-fg-muted">
                  Twoje próby:{' '}
                  {history.map((h, i) => (
                    <span key={i} className="mr-1.5 inline-block rounded-md bg-white/6 px-1.5 py-0.5 tabular-nums text-fg">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
