import { motion } from 'motion/react';
import { useState } from 'react';
import { BadgeCheck, Briefcase, Check, ExternalLink, TriangleAlert } from 'lucide-react';
import type { CompareStep, ConceptStep, RememberStep, ToolsStep } from '../../content/types';
import { TOOL_GUIDES } from '../../content/tools';
import { Callout, Icon, PromptBlock, cx } from '../ui';

export function StepHeading({ kicker, title, lead }: { kicker?: string; title: string; lead?: string }) {
  return (
    <div className="mb-5">
      {kicker && <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--level-color)]">{kicker}</div>}
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {lead && <p className="mt-2 max-w-3xl text-[1.02rem] leading-relaxed text-fg-muted">{lead}</p>}
    </div>
  );
}

export function ConceptView({ step }: { step: ConceptStep }) {
  return (
    <div>
      <StepHeading title={step.title} lead={step.lead} />
      <div className="grid gap-3 sm:grid-cols-2">
        {step.blocks.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.35 }}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
          >
            <div className="flex items-center gap-2.5">
              {b.icon && (
                <span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--level-color)_16%,transparent)] text-[var(--level-color)]">
                  <Icon name={b.icon} className="size-5" />
                </span>
              )}
              <h3 className="font-semibold">{b.title}</h3>
            </div>
            <p className="mt-2 text-[0.97rem] leading-relaxed text-fg-muted">{b.text}</p>
          </motion.div>
        ))}
      </div>
      {step.callout && (
        <div className="mt-4">
          <Callout tone={step.callout.tone}>{step.callout.text}</Callout>
        </div>
      )}
    </div>
  );
}

export function CompareView({ step }: { step: CompareStep }) {
  const [showResults, setShowResults] = useState(false);
  return (
    <div>
      <StepHeading title={step.title} lead={`Sytuacja: ${step.situation}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-bad/25 bg-bad/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-bad">
            <TriangleAlert className="size-4" aria-hidden="true" /> Słabsze polecenie
          </div>
          <PromptBlock tone="bad">{step.weak.prompt}</PromptBlock>
          {showResults && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Przykładowy wynik</div>
              <p className="prompt-text mt-1 text-sm leading-relaxed text-fg-muted">{step.weak.result}</p>
            </div>
          )}
          <ul className="mt-3 grid gap-1.5 text-[0.95rem]">
            {step.weak.problems.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-bad" aria-hidden="true" />
                <span className="text-fg-muted">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-ok/25 bg-ok/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ok">
            <BadgeCheck className="size-4" aria-hidden="true" /> Lepsze polecenie
          </div>
          <PromptBlock tone="good">{step.strong.prompt}</PromptBlock>
          {showResults && (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Przykładowy wynik</div>
              <p className="prompt-text mt-1 text-sm leading-relaxed text-fg-muted">{step.strong.result}</p>
            </div>
          )}
          <ul className="mt-3 grid gap-1.5 text-[0.95rem]">
            {step.strong.strengths.map((p) => (
              <li key={p} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
                <span className="text-fg-muted">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowResults((v) => !v)}
        className="mt-3 min-h-11 rounded-xl px-3 text-sm font-semibold text-tech hover:bg-tech/10"
        aria-expanded={showResults}
      >
        {showResults ? 'Ukryj przykładowe wyniki' : 'Pokaż, co odpowiedziałaby AI na każde polecenie'}
      </button>
      <div className="mt-3">
        <Callout tone="heat">
          <strong>Dlaczego to działa? </strong>
          {step.takeaway}
        </Callout>
      </div>
    </div>
  );
}

export function ToolsGuide({ step }: { step: ToolsStep }) {
  const [active, setActive] = useState(TOOL_GUIDES[0].id);
  const tool = TOOL_GUIDES.find((t) => t.id === active)!;
  return (
    <div>
      <StepHeading title={step.title} lead={step.lead} />
      <div role="tablist" aria-label="Wybierz narzędzie" className="mb-4 flex flex-wrap gap-2">
        {TOOL_GUIDES.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cx(
              'min-h-11 rounded-xl border px-4 text-sm font-semibold transition',
              active === t.id ? 'border-[var(--level-color)] bg-white/8 text-fg' : 'border-white/10 text-fg-muted hover:bg-white/5',
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">
            {tool.name} <span className="text-sm font-normal text-fg-muted">· {tool.vendor}</span>
          </h3>
          <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
            <ExternalLink className="size-3.5" aria-hidden="true" /> {tool.address}
          </span>
        </div>
        <p className="mt-2 text-[0.95rem] text-fg-muted">{tool.note}</p>
        <ol className="mt-4 grid gap-2.5">
          {tool.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--level-color)_18%,transparent)] text-sm font-bold text-[var(--level-color)]">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[0.97rem] leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 grid gap-3">
        <Callout tone="info">Wygląd i nazwy funkcji tych usług mogą się zmieniać. Zasady pisania poleceń, których uczysz się w tej aplikacji, działają w każdym z tych narzędzi.</Callout>
        <Callout tone="warn">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Briefcase className="size-4" aria-hidden="true" /> Zasady firmy:
          </span>{' '}
          sprawdź, które narzędzie AI jest dopuszczone w Twojej firmie i jakie dane wolno w nim przetwarzać.
        </Callout>
      </div>
    </div>
  );
}

export function RememberView({ step }: { step: RememberStep }) {
  return (
    <div>
      <StepHeading kicker="Zapamiętaj" title="Jedna zasada na dziś" />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--level-color)_45%,transparent)] p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--level-color) 16%, transparent), rgb(139 92 246 / 0.08))' }}
      >
        <p className="font-display text-xl font-semibold leading-snug sm:text-2xl">{step.rule}</p>
      </motion.div>
      <ul className="mt-5 grid gap-2.5">
        {step.details.map((d) => (
          <li key={d} className="flex gap-3 text-[0.98rem]">
            <Check className="mt-0.5 size-5 shrink-0 text-[var(--level-color)]" aria-hidden="true" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <Callout tone="heat">
          <strong>Wypróbuj w pracy: </strong>
          {step.tryAtWork}
        </Callout>
      </div>
    </div>
  );
}
