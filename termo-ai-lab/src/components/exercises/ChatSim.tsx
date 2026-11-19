import { AnimatePresence, motion } from 'motion/react';
import { Check, MessageSquare, TriangleAlert, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatChoice, ChatStep } from '../../content/types';
import { Callout, cx } from '../ui';
import { type ExerciseCommonProps } from './common';
import { StepHeading } from './StepViews';
import { GhostOrb } from '../ghost/GhostOrb';

interface Msg {
  from: 'user' | 'ai' | 'feedback';
  text: string;
  good?: boolean;
}

/** Symulacja rozmowy z AI. Odpowiedzi są przygotowane wcześniej — wyraźnie oznaczone jako symulacja. */
export function ChatSim({ step, onResult, onPhase }: { step: ChatStep } & ExerciseCommonProps) {
  const [node, setNode] = useState(step.start);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'user', text: step.firstMessage },
    { from: 'ai', text: step.nodes[step.start].ai },
  ]);
  const [choices, setChoices] = useState<{ good: boolean }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const current = step.nodes[node];
  const done = !!current?.end;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [msgs.length]);

  const pick = (c: ChatChoice) => {
    const next = step.nodes[c.next];
    const newChoices = [...choices, { good: c.good }];
    setChoices(newChoices);
    setMsgs((m) => [...m, { from: 'user', text: c.text }, { from: 'feedback', text: c.feedback, good: c.good }, { from: 'ai', text: next.ai }]);
    setNode(c.next);
    onPhase?.(c.good ? 'feedback' : 'improve');
    if (next.end) {
      const good = newChoices.filter((x) => x.good).length;
      const score = Math.round((good / newChoices.length) * 100);
      onResult({ score, skills: { [step.skill]: score } });
    }
  };

  return (
    <div>
      <StepHeading kicker="Symulacja rozmowy" title={step.title} lead={step.instruction} />
      <div className="rounded-2xl border border-white/10 bg-ink-950/60">
        <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4 text-tech" aria-hidden="true" /> Asystent AI
          </span>
          <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[0.7rem] text-fg-muted">Symulacja · odpowiedzi przygotowane wcześniej</span>
        </div>
        <div className="grid max-h-[460px] gap-3 overflow-y-auto p-4 scrollbar-thin" aria-live="polite">
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {m.from === 'user' && (
                  <div className="flex justify-end gap-2">
                    <div className="prompt-text max-w-[85%] rounded-2xl rounded-tr-md bg-[color-mix(in_oklab,var(--level-color)_22%,#152036)] px-4 py-2.5 text-[0.95rem]">{m.text}</div>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10" aria-hidden="true">
                      <User className="size-4" />
                    </span>
                  </div>
                )}
                {m.from === 'ai' && (
                  <div className="flex gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ai/20 text-[0.65rem] font-bold text-ai" aria-hidden="true">
                      AI
                    </span>
                    <div className="prompt-text max-w-[88%] rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.05] px-4 py-2.5 text-[0.95rem] leading-relaxed">{m.text}</div>
                  </div>
                )}
                {m.from === 'feedback' && (
                  <div className={cx('mx-auto flex max-w-[92%] items-start gap-2 rounded-xl border px-3 py-2 text-sm', m.good ? 'border-ok/30 bg-ok/8' : 'border-warn/35 bg-warn/8')}>
                    {m.good ? <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />}
                    <span>
                      <strong className="sr-only">Komentarz trenera: </strong>
                      {m.text}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
        {!done && current?.choices && (
          <div className="border-t border-white/8 p-4">
            <div className="mb-2 text-sm font-semibold text-fg-muted">Co odpowiesz AI?</div>
            <div className="grid gap-2">
              {current.choices.map((c) => (
                <button
                  key={c.text}
                  type="button"
                  onClick={() => pick(c)}
                  className="min-h-12 rounded-xl border border-white/10 px-4 py-2.5 text-left text-[0.95rem] transition hover:border-[var(--level-color)] hover:bg-white/5"
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {done && (
        <div className="mt-4 flex items-start gap-3">
          <GhostOrb size={36} mood="happy" />
          <div className="flex-1">
            <Callout tone="ok">{step.outro}</Callout>
          </div>
        </div>
      )}
    </div>
  );
}
