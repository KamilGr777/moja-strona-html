import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import type { ScreenId } from '../content/tours';

/**
 * Kontekst pomocy Duszka AI. Ekrany i kroki lekcji rejestrują, co Duszek ma powiedzieć:
 * proste wyjaśnienie zadania, kolejne podpowiedzi i następny krok. Pomoc kroku (priorytet 1)
 * ma pierwszeństwo przed pomocą ekranu (priorytet 0).
 */

export interface GhostNext {
  text: string;
  actionLabel?: string;
  route?: string;
}

export interface GhostHelp {
  screen: ScreenId;
  explain?: string;
  hints?: string[];
  next?: GhostNext;
}

interface Entry {
  id: number;
  priority: number;
  help: GhostHelp;
}

interface GhostState {
  entries: Entry[];
  open: boolean;
  /** Dodatkowe uniesienie Duszka (rem), gdy ekran ma przyklejony pasek przycisków na dole. */
  lift: number;
  setLift: (rem: number) => void;
  tourScreen: ScreenId | null;
  setOpen: (open: boolean) => void;
  startTour: (screen: ScreenId) => void;
  endTour: () => void;
  upsert: (e: Entry) => void;
  remove: (id: number) => void;
}

export const useGhost = create<GhostState>((set, get) => ({
  entries: [],
  open: false,
  lift: 0,
  setLift: (rem) => set({ lift: rem }),
  tourScreen: null,
  setOpen: (open) => set({ open }),
  startTour: (screen) => set({ tourScreen: screen, open: false }),
  endTour: () => set({ tourScreen: null }),
  upsert: (e) => {
    const rest = get().entries.filter((x) => x.id !== e.id);
    set({ entries: [...rest, e] });
  },
  remove: (id) => set({ entries: get().entries.filter((x) => x.id !== id) }),
}));

export function currentHelp(entries: Entry[]): GhostHelp | null {
  if (entries.length === 0) return null;
  const maxP = Math.max(...entries.map((e) => e.priority));
  const top = entries.filter((e) => e.priority === maxP);
  const screen = [...entries].reverse().find((e) => e.priority === 0)?.help;
  const merged = { ...(screen ?? {}), ...top[top.length - 1].help };
  return merged as GhostHelp;
}

let counter = 0;

/** Rejestruje pomoc Duszka na czas życia komponentu. */
export function useGhostHelp(help: GhostHelp, priority = 0) {
  const idRef = useRef<number>(0);
  if (idRef.current === 0) idRef.current = ++counter;
  const key = JSON.stringify(help);
  useEffect(() => {
    useGhost.getState().upsert({ id: idRef.current, priority, help: JSON.parse(key) as GhostHelp });
  }, [key, priority]);
  useEffect(() => {
    const id = idRef.current;
    return () => useGhost.getState().remove(id);
  }, []);
}

/** Unosi Duszka na czas życia komponentu (np. nad paskiem „Dalej” w lekcji). */
export function useGhostLift(rem: number) {
  useEffect(() => {
    useGhost.getState().setLift(rem);
    return () => useGhost.getState().setLift(0);
  }, [rem]);
}
