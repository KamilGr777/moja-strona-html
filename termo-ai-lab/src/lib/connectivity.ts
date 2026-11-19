import { create } from 'zustand';
import { fetchHealth } from './api';

export type AiStatus = 'checking' | 'available' | 'unavailable';

interface ConnectivityState {
  online: boolean;
  ai: AiStatus;
  model?: string;
  check: () => Promise<void>;
}

export const useConnectivity = create<ConnectivityState>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  ai: 'checking',
  model: undefined,
  check: async () => {
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    set({ online });
    if (!online) {
      set({ ai: 'unavailable' });
      return;
    }
    try {
      const h = await fetchHealth();
      set({ ai: h.ai ? 'available' : 'unavailable', model: h.model });
    } catch {
      set({ ai: 'unavailable', model: undefined });
    }
  },
}));

let initialized = false;

export function initConnectivity() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const { check } = useConnectivity.getState();
  void check();
  window.addEventListener('online', () => void useConnectivity.getState().check());
  window.addEventListener('offline', () => useConnectivity.setState({ online: false, ai: 'unavailable' }));
  window.setInterval(() => void useConnectivity.getState().check(), 5 * 60 * 1000);
}

/** Czy funkcje AI są teraz dostępne. */
export function aiReady(): boolean {
  const s = useConnectivity.getState();
  return s.online && s.ai === 'available';
}
