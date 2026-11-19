import type { IconName } from './types';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}

/** Odznaki — subtelne potwierdzenie postępów, bez presji i bez kar. */
export const BADGES: BadgeDef[] = [
  { id: 'pierwszy-prompt', title: 'Pierwszy prompt', description: 'Sprawdziłeś swój pierwszy prompt w trenażerze.', icon: 'sparkles', color: '#2dd4bf' },
  { id: 'odkrywca', title: 'Odkrywca AI', description: 'Ukończyłeś pierwszą lekcję.', icon: 'eye', color: '#38bdf8' },
  { id: 'krok-po-kroku', title: 'Krok po kroku', description: 'Poprawiłeś prompt o co najmniej 20 punktów w kolejnej próbie.', icon: 'repeat', color: '#a78bfa' },
  { id: 'mistrz-precyzji', title: 'Mistrz precyzji', description: 'Uzyskałeś co najmniej 90/100 w trenażerze promptów.', icon: 'target', color: '#fbbf24' },
  { id: 'lowca-bledow', title: 'Łowca błędów', description: 'Bezbłędnie wskazałeś wszystkie błędy AI w ćwiczeniu.', icon: 'alert', color: '#fb923c' },
  { id: 'straznik-danych', title: 'Strażnik danych', description: 'Poprawnie zanonimizowałeś tekst przed wklejeniem do AI.', icon: 'lock', color: '#34d399' },
  { id: 'analityk', title: 'Analityk danych', description: 'Ukończyłeś lekcję o pracy z wykresami i danymi.', icon: 'chart', color: '#facc15' },
  { id: 'architekt', title: 'Architekt procesów', description: 'Ukończyłeś lekcję o instrukcjach wieloetapowych.', icon: 'route', color: '#f87171' },
  { id: 'absolwent-1', title: 'Absolwent poziomu 1', description: 'Ukończyłeś wszystkie lekcje poziomu początkującego.', icon: 'check', color: '#34d399' },
  { id: 'absolwent-2', title: 'Absolwent poziomu 2', description: 'Ukończyłeś wszystkie lekcje poziomu średniego.', icon: 'check', color: '#facc15' },
  { id: 'absolwent-3', title: 'Absolwent poziomu 3', description: 'Ukończyłeś wszystkie lekcje poziomu zaawansowanego.', icon: 'check', color: '#f87171' },
  { id: 'ekspert-komunikacji', title: 'Ekspert komunikacji z AI', description: 'Uzyskałeś rekomendację przejścia na kolejny poziom w sprawdzianie gotowości.', icon: 'message', color: '#a78bfa' },
];

export const POINTS = {
  lessonComplete: 50,
  exerciseFirstComplete: 10,
  trainerPerTenPoints: 1,
  assessmentComplete: 30,
};
