import { Check, RotateCcw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ExerciseResult } from '../../content/types';
import { Button, cx } from '../ui';

export type Phase = 'try' | 'feedback' | 'improve';

export interface ExerciseCommonProps {
  onResult: (r: ExerciseResult) => void;
  onPhase?: (p: Phase) => void;
  /** Tryb sprawdzianu: jedna próba, bez powtarzania. */
  assessment?: boolean;
}

export function ResultBanner({ score, good, children }: { score: number; good?: boolean; children?: ReactNode }) {
  const ok = good ?? score >= 80;
  return (
    <div
      role="status"
      className={cx('mt-4 flex items-start gap-3 rounded-2xl border p-4', ok ? 'border-ok/35 bg-ok/8' : 'border-warn/35 bg-warn/8')}
    >
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', ok ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn')}>
        {ok ? <Check className="size-5" aria-hidden="true" /> : <RotateCcw className="size-5" aria-hidden="true" />}
      </span>
      <div className="text-[0.97rem] leading-relaxed">
        <div className="font-semibold">
          Wynik: {score}/100 {ok ? '— świetnie!' : '— możesz poprawić'}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Verdict({ correct }: { correct: boolean }) {
  return correct ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-ok">
      <Check className="size-3.5" aria-hidden="true" /> Dobrze
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad">
      <X className="size-3.5" aria-hidden="true" /> Nie
    </span>
  );
}

export function CheckBar({
  checked,
  canCheck,
  onCheck,
  onRetry,
  assessment,
  checkLabel = 'Sprawdź',
  hint,
}: {
  checked: boolean;
  canCheck: boolean;
  onCheck: () => void;
  onRetry: () => void;
  assessment?: boolean;
  checkLabel?: string;
  hint?: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {!checked ? (
        <>
          <Button onClick={onCheck} disabled={!canCheck} variant="level">
            {checkLabel}
          </Button>
          {!canCheck && hint && <span className="text-sm text-fg-muted">{hint}</span>}
        </>
      ) : (
        !assessment && (
          <Button variant="secondary" onClick={onRetry} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
            Spróbuj ponownie
          </Button>
        )
      )}
    </div>
  );
}

export function shuffle<T>(arr: T[], seed = 7): T[] {
  // Deterministyczne tasowanie (stabilne między odświeżeniami), różne od kolejności poprawnej.
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.every((x, i) => x === arr[i]) && a.length > 1) return [...a.slice(1), a[0]];
  return a;
}
