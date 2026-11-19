import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui';
import { toast } from '../lib/toast';

type UpdateFn = (reload?: boolean) => Promise<void>;

/**
 * Rejestracja service workera (tryb offline) i komunikat o nowej wersji.
 * Nowa wersja nie przeładowuje strony bez zgody — użytkownik nie traci pracy.
 */
export function UpdatePrompt() {
  const [update, setUpdate] = useState<UpdateFn | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return;
        const updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            setUpdate(() => updateSW);
          },
          onOfflineReady() {
            toast({ title: 'Aplikacja gotowa do pracy offline', text: 'Lekcje i ćwiczenia będą działać także bez Internetu.', tone: 'success' }, 3500);
          },
        });
      })
      .catch(() => {
        /* brak wsparcia — aplikacja działa dalej online */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[65] flex justify-center px-3 lg:bottom-6" role="status">
      <div className="glass-strong flex w-full max-w-md items-center gap-3 rounded-2xl p-3">
        <RefreshCw className="size-5 shrink-0 text-tech" aria-hidden="true" />
        <span className="flex-1 text-sm">Dostępna jest nowa wersja aplikacji.</span>
        <Button onClick={() => void update(true)}>Odśwież</Button>
        <Button variant="ghost" onClick={() => setUpdate(null)}>
          Później
        </Button>
      </div>
    </div>
  );
}
