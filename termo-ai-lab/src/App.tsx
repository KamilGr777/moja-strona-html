import { MotionConfig } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useEffect } from 'react';
import { Ghost } from './components/ghost/Ghost';
import { Tour } from './components/ghost/Tour';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from './components/Toaster';
import { Button } from './components/ui';
import { UpdatePrompt } from './components/UpdatePrompt';
import { LEVELS } from './content/levels';
import { getLesson } from './content/lessons';
import { useConnectivity } from './lib/connectivity';
import { useGhost, useGhostHelp } from './lib/ghost';
import { useReducedMotionPref } from './lib/motion';
import { navigate, useRoute, type Route } from './lib/router';
import { useProgress } from './lib/store';
import { Assessment } from './screens/Assessment';
import { Dashboard } from './screens/Dashboard';
import { Intro } from './screens/Intro';
import { Lab, LabTask } from './screens/Lab';
import { LessonPlayer } from './screens/LessonPlayer';
import { Lessons } from './screens/Lessons';
import { LevelSelect } from './screens/LevelSelect';
import { Library, LibraryItem } from './screens/Library';
import { Placement } from './screens/Placement';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';

const FULLSCREEN: Route['name'][] = ['welcome', 'intro', 'levels', 'placement'];

function NotFound() {
  useGhostHelp({ screen: 'dashboard', explain: 'Ten adres nie istnieje w aplikacji.', next: { text: 'Wróć do ekranu głównego.', actionLabel: 'Ekran główny', route: '#/start' } });
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-2xl font-bold" data-page-title tabIndex={-1}>
        Nie znaleziono tej strony
      </h1>
      <p className="mt-2 text-fg-muted">Być może link jest nieaktualny.</p>
      <Button className="mt-6" onClick={() => navigate({ name: 'dashboard' })}>
        Wróć do ekranu głównego
      </Button>
    </div>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'welcome':
      return <Welcome />;
    case 'intro':
      return <Intro />;
    case 'levels':
      return <LevelSelect />;
    case 'placement':
      return <Placement />;
    case 'dashboard':
      return <Dashboard />;
    case 'lessons':
      return <Lessons level={route.level} />;
    case 'lesson':
      return <LessonPlayer key={route.id} id={route.id} />;
    case 'lab':
      return <Lab />;
    case 'labTask':
      return <LabTask key={route.id} id={route.id} />;
    case 'assessment':
      return <Assessment key={route.level} level={route.level} />;
    case 'library':
      return <Library />;
    case 'libraryItem':
      return <LibraryItem key={route.id} id={route.id} />;
    case 'progress':
      return <Progress />;
    case 'settings':
      return <Settings />;
    default:
      return <NotFound />;
  }
}

function OfflineBanner() {
  const online = useConnectivity((s) => s.online);
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-ink-700 px-4 py-2 text-center text-sm text-fg" role="status">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      Jesteś offline. Lekcje i ćwiczenia działają dalej; ocena modelem AI wróci po odzyskaniu połączenia.
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const level = useProgress((s) => s.level);
  const settings = useProgress((s) => s.settings);
  const reduce = useReducedMotionPref();

  // Kolor przewodni zależy od poziomu (lekcje i zadania mogą go nadpisać lokalnie).
  const routeLevel = route.name === 'lesson' ? getLesson(route.id)?.level : route.name === 'assessment' ? route.level : undefined;
  const color = LEVELS[routeLevel ?? level ?? 'poczatkujacy'].color;

  useEffect(() => {
    document.documentElement.style.setProperty('--level-color', color);
  }, [color]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = settings.motion;
    root.dataset.largeText = String(settings.largeText);
  }, [settings]);

  // Ekrany wymagające wybranego poziomu.
  useEffect(() => {
    if (!level && route.name === 'dashboard') navigate({ name: 'levels' }, { replace: true });
  }, [level, route.name]);

  // Po zmianie ekranu: przewiń na górę i ustaw fokus na tytule (czytniki ekranu, klawiatura).
  const routeKey = JSON.stringify(route);
  useEffect(() => {
    // Samouczek i panel pomocy dotyczą jednego ekranu — zamykamy je po przejściu dalej.
    useGhost.getState().endTour();
    useGhost.getState().setOpen(false);
    window.scrollTo({ top: 0 });
    const t = window.setTimeout(() => {
      const h = document.querySelector<HTMLElement>('[data-page-title]');
      h?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [routeKey]);

  const fullscreen = FULLSCREEN.includes(route.name);

  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
      <OfflineBanner />
      {fullscreen ? (
        <Screen route={route} />
      ) : (
        <AppShell>
          <Screen route={route} />
        </AppShell>
      )}
      <Ghost raised={!fullscreen} />
      <Tour />
      <Toaster />
      <UpdatePrompt />
    </MotionConfig>
  );
}
