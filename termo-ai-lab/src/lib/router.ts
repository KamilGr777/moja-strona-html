import { useSyncExternalStore } from 'react';
import type { LevelId } from '../content/types';

/**
 * Minimalny router oparty na adresie po znaku # — działa offline, w zainstalowanej PWA,
 * na dowolnej ścieżce serwera i w aplikacji Android (Capacitor). Przycisk „Wstecz” przeglądarki działa.
 */

export type Route =
  | { name: 'welcome' }
  | { name: 'intro' }
  | { name: 'levels' }
  | { name: 'placement' }
  | { name: 'dashboard' }
  | { name: 'lessons'; level?: LevelId }
  | { name: 'lesson'; id: string }
  | { name: 'lab' }
  | { name: 'labTask'; id: string }
  | { name: 'assessment'; level: LevelId }
  | { name: 'library' }
  | { name: 'libraryItem'; id: string }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'notFound' };

const LEVEL_IDS: LevelId[] = ['poczatkujacy', 'sredni', 'zaawansowany'];
const isLevel = (v: string | undefined): v is LevelId => !!v && (LEVEL_IDS as string[]).includes(v);

export function parseHash(hash: string): Route {
  const path = decodeURIComponent(hash.replace(/^#/, '')).replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const [a, b] = parts;
  if (parts.length === 0) return { name: 'welcome' };
  switch (a) {
    case 'wprowadzenie':
      return { name: 'intro' };
    case 'poziomy':
      return { name: 'levels' };
    case 'test-poziomu':
      return { name: 'placement' };
    case 'start':
      return { name: 'dashboard' };
    case 'lekcje':
      return isLevel(b) ? { name: 'lessons', level: b } : { name: 'lessons' };
    case 'lekcja':
      return b ? { name: 'lesson', id: b } : { name: 'lessons' };
    case 'laboratorium':
      return b ? { name: 'labTask', id: b } : { name: 'lab' };
    case 'sprawdzian':
      return isLevel(b) ? { name: 'assessment', level: b } : { name: 'notFound' };
    case 'biblioteka':
      return b ? { name: 'libraryItem', id: b } : { name: 'library' };
    case 'postepy':
      return { name: 'progress' };
    case 'ustawienia':
      return { name: 'settings' };
    default:
      return { name: 'notFound' };
  }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'welcome':
      return '#/';
    case 'intro':
      return '#/wprowadzenie';
    case 'levels':
      return '#/poziomy';
    case 'placement':
      return '#/test-poziomu';
    case 'dashboard':
      return '#/start';
    case 'lessons':
      return route.level ? `#/lekcje/${route.level}` : '#/lekcje';
    case 'lesson':
      return `#/lekcja/${route.id}`;
    case 'lab':
      return '#/laboratorium';
    case 'labTask':
      return `#/laboratorium/${route.id}`;
    case 'assessment':
      return `#/sprawdzian/${route.level}`;
    case 'library':
      return '#/biblioteka';
    case 'libraryItem':
      return `#/biblioteka/${route.id}`;
    case 'progress':
      return '#/postepy';
    case 'settings':
      return '#/ustawienia';
    default:
      return '#/';
  }
}

export function navigate(to: Route | string, opts: { replace?: boolean } = {}) {
  const hash = typeof to === 'string' ? to : toHash(to);
  if (window.location.hash === hash) return;
  if (opts.replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '#/');
  return parseHash(hash);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '#/');
}
