import { Cpu, Download, FlaskConical, Monitor, Share, Smartphone, SquarePlus, Trash2, Upload, WifiOff } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageHeader } from '../components/layout/AppShell';
import { Button, Callout, Card, cx } from '../components/ui';
import { useConnectivity } from '../lib/connectivity';
import { useGhostHelp } from '../lib/ghost';
import { platformHint, useInstall } from '../lib/install';
import { navigate } from '../lib/router';
import { STORAGE_KEY, useProgress } from '../lib/store';
import { toast } from '../lib/toast';

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl border border-white/10 p-1 sm:inline-grid sm:grid-flow-col">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-10 rounded-lg px-3 text-sm font-semibold', value === o.value ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const settings = useProgress((s) => s.settings);
  const setSettings = useProgress((s) => s.setSettings);
  const resetProgress = useProgress((s) => s.resetProgress);
  const { online, ai, model, check } = useConnectivity();
  const { deferred, installed, promptInstall } = useInstall();
  const [confirmReset, setConfirmReset] = useState(false);
  const platform = platformHint();

  useGhostHelp({
    screen: 'settings',
    explain: 'Tu zmienisz wygląd (animacje, wielkość tekstu), zainstalujesz aplikację i sprawdzisz, czy ocena korzysta z modelu AI.',
    next: { text: 'Jeśli chcesz mieć aplikację na pulpicie lub ekranie telefonu — skorzystaj z sekcji „Zainstaluj aplikację”.' },
  });

  const importRef = useRef<HTMLInputElement>(null);
  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { state?: { version?: number } };
      if (!parsed?.state || parsed.state.version !== 1) throw new Error('format');
      window.localStorage.setItem(STORAGE_KEY, text);
      await useProgress.persist.rehydrate();
      toast({ title: 'Wczytano kopię postępów', tone: 'success' });
    } catch {
      toast({ title: 'Nie udało się wczytać pliku', text: 'Wybierz plik pobrany przyciskiem „Pobierz kopię postępów”.', tone: 'error' });
    }
  };

  const exportData = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-ai-lab-postep-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Nie udało się zapisać pliku', tone: 'error' });
    }
  };

  return (
    <div>
      <PageHeader title="Ustawienia i instalacja" subtitle="Dopasuj aplikację do siebie." />
      <div className="grid gap-5">
        <Card data-tour="settings-motion">
          <h2 className="font-display text-lg font-semibold">Wygląd i dostępność</h2>
          <div className="mt-4 grid gap-5">
            <div>
              <div className="mb-2 font-medium">Animacje</div>
              <Segmented
                label="Animacje"
                value={settings.motion}
                onChange={(motion) => setSettings({ motion })}
                options={[
                  { value: 'system', label: 'Jak w systemie' },
                  { value: 'reduce', label: 'Ograniczone' },
                  { value: 'full', label: 'Pełne' },
                ]}
              />
              <p className="mt-2 text-sm text-fg-muted">„Ograniczone” wyłącza ruchome tło i przejścia — przydatne przy wrażliwości na ruch lub słabszym urządzeniu.</p>
            </div>
            <div>
              <div className="mb-2 font-medium">Wielkość tekstu</div>
              <Segmented
                label="Wielkość tekstu"
                value={settings.largeText ? 'large' : 'normal'}
                onChange={(v) => setSettings({ largeText: v === 'large' })}
                options={[
                  { value: 'normal', label: 'Standardowa' },
                  { value: 'large', label: 'Większa' },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card data-tour="settings-install">
          <h2 className="font-display text-lg font-semibold">{__STANDALONE__ ? 'Wersja w jednym pliku' : 'Zainstaluj aplikację'}</h2>
          {__STANDALONE__ ? (
            <div className="mt-2 grid gap-2 text-[0.95rem] text-fg-muted">
              <p>
                Korzystasz z wersji, która mieści się w jednym pliku <strong className="text-fg">TERMO-AI-LAB.html</strong>. Nie wymaga instalacji ani Internetu — wystarczy otworzyć plik dwuklikiem.
              </p>
              <ul className="grid gap-1">
                <li>• Zapisz plik w stałym miejscu (np. na pulpicie lub w Dokumentach) i otwieraj go zawsze w tej samej przeglądarce — tam zapisuje się Twój postęp.</li>
                <li>• Chcesz przenieść postęp na inny komputer? Użyj „Pobierz kopię postępów” i „Wczytaj kopię postępów” poniżej.</li>
                <li>• Ocena promptów działa tu w trybie demonstracyjnym. Ocena modelem AI wymaga wersji z serwerem (patrz README).</li>
              </ul>
            </div>
          ) : (
          <p className="mt-1 text-[0.95rem] text-fg-muted">
            TERMO AI LAB to aplikacja PWA: instalujesz ją z przeglądarki, bez sklepu z aplikacjami. Działa w osobnym oknie, a lekcje są dostępne także bez Internetu.
          </p>
          )}
          {__STANDALONE__ ? null : installed ? (
            <div className="mt-4">
              <Callout tone="ok">Aplikacja jest zainstalowana i działa w trybie samodzielnego okna.</Callout>
            </div>
          ) : deferred ? (
            <Button
              className="mt-4"
              icon={<Download className="size-4" aria-hidden="true" />}
              onClick={async () => {
                const r = await promptInstall();
                if (r === 'accepted') toast({ title: 'Instalacja rozpoczęta', tone: 'success' });
              }}
            >
              Zainstaluj teraz
            </Button>
          ) : null}
          {!__STANDALONE__ && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className={cx('rounded-2xl border p-4', platform === 'desktop' ? 'border-tech/40 bg-tech/[0.05]' : 'border-white/8')}>
              <div className="flex items-center gap-2 font-semibold">
                <Monitor className="size-4 text-tech" aria-hidden="true" /> Windows (Edge, Chrome)
              </div>
              <ol className="mt-2 grid gap-1 text-sm text-fg-muted">
                <li>1. Otwórz aplikację w Edge lub Chrome.</li>
                <li>2. Kliknij ikonę instalacji w pasku adresu (monitor ze strzałką) lub menu ⋯ → „Aplikacje” → „Zainstaluj”.</li>
                <li>3. Aplikacja pojawi się w menu Start.</li>
              </ol>
            </div>
            <div className={cx('rounded-2xl border p-4', platform === 'android' ? 'border-tech/40 bg-tech/[0.05]' : 'border-white/8')}>
              <div className="flex items-center gap-2 font-semibold">
                <Smartphone className="size-4 text-tech" aria-hidden="true" /> Android (Chrome)
              </div>
              <ol className="mt-2 grid gap-1 text-sm text-fg-muted">
                <li>1. Otwórz aplikację w Chrome.</li>
                <li>2. Menu ⋮ → „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</li>
                <li>3. Ikona pojawi się na ekranie telefonu.</li>
              </ol>
            </div>
            <div className={cx('rounded-2xl border p-4', platform === 'ios' ? 'border-tech/40 bg-tech/[0.05]' : 'border-white/8')}>
              <div className="flex items-center gap-2 font-semibold">
                <Share className="size-4 text-tech" aria-hidden="true" /> iPhone i iPad (Safari)
              </div>
              <ol className="mt-2 grid gap-1 text-sm text-fg-muted">
                <li>1. Otwórz aplikację w Safari.</li>
                <li>
                  2. Stuknij „Udostępnij” <Share className="inline size-3.5" aria-hidden="true" />.
                </li>
                <li>
                  3. Wybierz „Do ekranu początkowego” <SquarePlus className="inline size-3.5" aria-hidden="true" />.
                </li>
              </ol>
            </div>
          </div>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Ocena promptów i model AI</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!online ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1 text-sm font-semibold text-fg-muted">
                <WifiOff className="size-4" aria-hidden="true" /> Brak połączenia z Internetem
              </span>
            ) : ai === 'available' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ai/40 bg-ai/12 px-3 py-1 text-sm font-semibold text-ai">
                <Cpu className="size-4" aria-hidden="true" /> Model AI połączony{model ? `: ${model}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-3 py-1 text-sm font-semibold text-warn">
                <FlaskConical className="size-4" aria-hidden="true" /> Tryb demonstracyjny
              </span>
            )}
            <Button variant="ghost" onClick={() => void check()}>
              Sprawdź ponownie
            </Button>
          </div>
          <ul className="mt-4 grid gap-2 text-[0.95rem] text-fg-muted">
            <li>
              <strong className="text-ai">Z modelem AI:</strong> ocena promptów, ulepszona wersja Twojego polecenia, uruchamianie promptu w AI i wyjaśnianie dowolnych pojęć. Wymaga Internetu i serwera aplikacji z kluczem API.
            </li>
            <li>
              <strong className="text-warn">Tryb demonstracyjny:</strong> ocena regułowa (bez AI) — orientacyjna, wyraźnie oznaczona. Lekcje, ćwiczenia, testy, biblioteka, samouczek i słownik Duszka działają w pełni, także offline.
            </li>
            <li>Klucz API jest przechowywany wyłącznie na serwerze aplikacji — nigdy w przeglądarce.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Twoje dane</h2>
          <p className="mt-1 text-[0.95rem] text-fg-muted">
            Postęp zapisuje się automatycznie tylko na tym urządzeniu (pamięć przeglądarki). Nie wysyłamy go nigdzie. Do modelu AI trafia wyłącznie treść promptu, który sam oceniasz lub uruchamiasz.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={exportData} icon={<Download className="size-4" aria-hidden="true" />}>
              Pobierz kopię postępów
            </Button>
            <Button variant="secondary" onClick={() => importRef.current?.click()} icon={<Upload className="size-4" aria-hidden="true" />}>
              Wczytaj kopię postępów
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Plik z kopią postępów"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importData(f);
                e.target.value = '';
              }}
            />
            {!confirmReset ? (
              <Button variant="danger" onClick={() => setConfirmReset(true)} icon={<Trash2 className="size-4" aria-hidden="true" />}>
                Wyczyść postępy
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bad/40 bg-bad/8 p-2">
                <span className="px-2 text-sm">Na pewno? Tej operacji nie można cofnąć.</span>
                <Button
                  variant="danger"
                  onClick={() => {
                    resetProgress();
                    setConfirmReset(false);
                    toast({ title: 'Postępy wyczyszczone', tone: 'info' });
                    navigate({ name: 'welcome' });
                  }}
                >
                  Tak, wyczyść
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                  Anuluj
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">O aplikacji</h2>
          <p className="mt-1 text-[0.95rem] text-fg-muted">
            TERMO AI LAB — Interaktywna Akademia Sztucznej Inteligencji, wersja {__APP_VERSION__}. Wszystkie dane w ćwiczeniach są fikcyjne. AI wspiera specjalistę, ale nie zastępuje jego odpowiedzialności — decyzje eksploatacyjne podejmują kompetentni ludzie.
          </p>
        </Card>
      </div>
    </div>
  );
}
