import { AnimatePresence, motion } from 'motion/react';
import { Check, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { BADGES } from '../content/badges';
import { useProgress } from '../lib/store';
import { toast, useToasts } from '../lib/toast';
import { Icon, cx } from './ui';

/** Powiadomienia (np. nowa odznaka). Krótkie, nienachalne, znikają same. */
export function Toaster() {
  const { toasts, dismiss } = useToasts();
  const newBadges = useProgress((s) => s.newBadges);

  useEffect(() => {
    if (newBadges.length === 0) return;
    const ids = useProgress.getState().consumeNewBadges();
    for (const id of ids) {
      const b = BADGES.find((x) => x.id === id);
      if (b) toast({ title: `Nowa odznaka: ${b.title}`, text: b.description, tone: 'badge', icon: b.icon, color: b.color }, 6000);
    }
  }, [newBadges]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-3" aria-live="polite" role="status">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-strong pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl p-3.5"
          >
            <span
              className={cx(
                'grid size-9 shrink-0 place-items-center rounded-full',
                t.tone === 'success' && 'bg-ok/18 text-ok',
                t.tone === 'info' && 'bg-sky/18 text-sky',
                (t.tone === 'warn' || t.tone === 'error') && 'bg-warn/18 text-warn',
              )}
              style={t.tone === 'badge' ? { background: `${t.color}26`, color: t.color, boxShadow: `0 0 18px -4px ${t.color}` } : undefined}
            >
              {t.tone === 'badge' && t.icon ? (
                <Icon name={t.icon} className="size-5" />
              ) : t.tone === 'success' ? (
                <Check className="size-5" aria-hidden="true" />
              ) : t.tone === 'info' ? (
                <Info className="size-5" aria-hidden="true" />
              ) : (
                <TriangleAlert className="size-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{t.title}</div>
              {t.text && <div className="text-sm text-fg-muted">{t.text}</div>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-white/5" aria-label="Zamknij powiadomienie">
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
