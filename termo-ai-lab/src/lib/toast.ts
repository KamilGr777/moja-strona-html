import { create } from 'zustand';
import type { IconName } from '../content/types';

export interface Toast {
  id: number;
  title: string;
  text?: string;
  tone: 'success' | 'info' | 'warn' | 'badge' | 'error';
  icon?: IconName;
  color?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ttlMs?: number) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, ttlMs = 4500) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-1), { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), ttlMs);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = (t: Omit<Toast, 'id'>, ttlMs?: number) => useToasts.getState().push(t, ttlMs);
