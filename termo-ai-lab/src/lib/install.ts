import { create } from 'zustand';

/** Obsługa instalacji PWA: zdarzenie beforeinstallprompt (Chrome, Edge, Android). */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const useInstall = create<InstallState>((set, get) => ({
  deferred: null,
  installed: false,
  promptInstall: async () => {
    const d = get().deferred;
    if (!d) return 'unavailable';
    await d.prompt();
    const choice = await d.userChoice;
    set({ deferred: null });
    return choice.outcome;
  },
}));

export function initInstall() {
  if (typeof window === 'undefined') return;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) useInstall.setState({ installed: true });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ deferred: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ installed: true, deferred: null }));
}

export function platformHint(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
