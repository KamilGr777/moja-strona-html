import { Check, Copy, Cpu, FlaskConical, Info, TriangleAlert, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LEVELS } from '../../content/levels';
import type { LevelId } from '../../content/types';
import { copyText } from '../../lib/clipboard';
import { toast } from '../../lib/toast';

export { Icon } from './Icon';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Przyciski                                                           */
/* ------------------------------------------------------------------ */

type Variant = 'primary' | 'secondary' | 'ghost' | 'level' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-tech to-sky text-ink-950 shadow-[0_8px_28px_-10px_rgb(45_212_191/0.7)] hover:brightness-110 active:brightness-95',
  level: 'text-ink-950 shadow-[0_8px_28px_-12px_var(--level-color)] hover:brightness-110 active:brightness-95 bg-[var(--level-color)]',
  secondary: 'glass text-fg hover:bg-white/10 active:bg-white/5',
  ghost: 'text-fg-muted hover:text-fg hover:bg-white/5',
  danger: 'bg-bad/15 text-bad border border-bad/40 hover:bg-bad/25',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-45',
        size === 'lg' ? 'min-h-14 px-6 text-base' : 'min-h-12 px-5 text-[0.95rem]',
        block && 'w-full',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Karty i układ                                                       */
/* ------------------------------------------------------------------ */

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('glass rounded-[var(--radius-card)] p-5 sm:p-6', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{children}</h2>
      {hint && <div className="text-sm text-fg-muted">{hint}</div>}
    </div>
  );
}

export function Callout({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'heat' | 'ok'; children: ReactNode }) {
  const styles = {
    info: 'border-sky/30 bg-sky/8 text-fg',
    warn: 'border-warn/35 bg-warn/8 text-fg',
    heat: 'border-heat/35 bg-heat/8 text-fg',
    ok: 'border-ok/35 bg-ok/8 text-fg',
  }[tone];
  const IconC = tone === 'warn' ? TriangleAlert : tone === 'heat' ? Flame : tone === 'ok' ? Check : Info;
  const iconColor = { info: 'text-sky', warn: 'text-warn', heat: 'text-heat', ok: 'text-ok' }[tone];
  return (
    <div className={cx('flex gap-3 rounded-2xl border p-4 text-[0.95rem] leading-relaxed', styles)}>
      <IconC className={cx('mt-0.5 size-5 shrink-0', iconColor)} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pasek postępu                                                       */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  color = 'var(--level-color)',
  label,
  size = 'md',
}: {
  value: number;
  color?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cx('w-full overflow-hidden rounded-full bg-white/8', size === 'sm' ? 'h-1.5' : 'h-2.5')}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 60%, white))`, boxShadow: `0 0 12px ${color}` }}
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Oznaczenia poziomu i trybu                                          */
/* ------------------------------------------------------------------ */

export function LevelPill({ level, className }: { level: LevelId; className?: string }) {
  const info = LEVELS[level];
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide', className)}
      style={{ color: info.color, borderColor: `color-mix(in oklab, ${info.color} 45%, transparent)`, background: info.colorSoft }}
    >
      <span className="size-1.5 rounded-full" style={{ background: info.color, boxShadow: `0 0 8px ${info.color}` }} />
      {info.name}
    </span>
  );
}

export function ModeBadge({ mode, model }: { mode: 'ai' | 'demo'; model?: string }) {
  if (mode === 'ai') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ai/40 bg-ai/12 px-2.5 py-1 text-xs font-semibold text-ai">
        <Cpu className="size-3.5" aria-hidden="true" />
        Ocena modelu AI{model ? ` · ${model}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">
      <FlaskConical className="size-3.5" aria-hidden="true" />
      Tryb demonstracyjny · ocena regułowa (bez AI)
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Wynik procentowy                                                    */
/* ------------------------------------------------------------------ */

export function scoreColor(score: number) {
  if (score >= 85) return '#34d399';
  if (score >= 70) return '#2dd4bf';
  if (score >= 50) return '#fbbf24';
  return '#fb923c';
}

export function ScoreRing({ score, size = 132, label = 'na 100' }: { score: number; size?: number; label?: string }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Wynik ${score} na 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / 0.08)" strokeWidth={10} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-4xl font-bold leading-none tabular-nums" style={{ color }}>
            {score}
          </div>
          <div className="mt-1 text-xs text-fg-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kopiowanie                                                          */
/* ------------------------------------------------------------------ */

export function CopyButton({ text, label = 'Kopiuj', className, variant = 'secondary' }: { text: string; label?: string; className?: string; variant?: Variant }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={variant}
      className={className}
      icon={done ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        } else {
          toast({ title: 'Nie udało się skopiować', text: 'Zaznacz tekst ręcznie i skopiuj (Ctrl+C).', tone: 'warn' });
        }
      }}
    >
      {done ? 'Skopiowano' : label}
    </Button>
  );
}

export function PromptBlock({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'bad' | 'good' }) {
  const border = tone === 'bad' ? 'border-bad/35 bg-bad/6' : tone === 'good' ? 'border-ok/35 bg-ok/6' : 'border-white/10 bg-ink-950/50';
  return <div className={cx('prompt-text rounded-xl border p-4 text-[0.95rem] leading-relaxed text-fg', border)}>{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-xs text-fg-muted">{children}</kbd>;
}
