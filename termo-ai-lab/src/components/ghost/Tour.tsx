import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TOURS, type TourStep } from '../../content/tours';
import { useGhost } from '../../lib/ghost';
import { Button } from '../ui';
import { GhostOrb } from './GhostOrb';

function visibleTarget(step: TourStep): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`));
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }) ?? null;
}

/** Samouczek: podświetla kolejne elementy bieżącego ekranu i objaśnia je. Działa bez AI. */
export function Tour() {
  const screen = useGhost((s) => s.tourScreen);
  const endTour = useGhost((s) => s.endTour);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!screen) return;
    const available = (TOURS[screen] ?? []).filter((s) => visibleTarget(s));
    setSteps(available);
    setIndex(0);
    if (available.length === 0) endTour();
  }, [screen, endTour]);

  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = visibleTarget(step);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = visibleTarget(step);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    measure();
    cardRef.current?.focus();
  }, [step, measure]);

  useEffect(() => {
    if (!screen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [screen, steps.length, endTour, measure]);

  if (!screen || !step) return null;

  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 24);
  let cardTop = 16;
  let cardLeft = (vw - cardW) / 2;
  if (rect) {
    const below = rect.bottom + pad + 12;
    const above = rect.top - pad - 12;
    cardTop = below + 190 < vh ? below : Math.max(12, above - 190);
    cardLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 12);
  }
  const last = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      <div className="absolute inset-0" onClick={endTour} aria-hidden="true" />
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-tech transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgb(3 6 15 / 0.74), 0 0 24px rgb(45 212 191 / 0.55)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-ink-950/75" />
      )}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-label={`Samouczek: ${step.title}`}
        className="glass-strong absolute rounded-2xl p-4 outline-none"
        style={{ top: cardTop, left: cardLeft, width: cardW }}
      >
        <div className="flex items-start gap-3">
          <GhostOrb size={34} mood="happy" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-tech">
              Samouczek · {index + 1} z {steps.length}
            </div>
            <h3 className="mt-1 font-display text-base font-semibold">{step.title}</h3>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-fg-muted">{step.text}</p>
          </div>
          <button type="button" onClick={endTour} className="grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-white/5" aria-label="Zakończ samouczek">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Wstecz
          </Button>
          <Button onClick={() => (last ? endTour() : setIndex((i) => i + 1))}>{last ? 'Zakończ' : 'Dalej'}</Button>
        </div>
      </div>
    </div>
  );
}
