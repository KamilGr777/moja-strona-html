import type { CurriculumModule, LevelId, LevelInfo, SkillId } from './types';

export const LEVELS: Record<LevelId, LevelInfo> = {
  poczatkujacy: {
    id: 'poczatkujacy',
    name: 'Początkujący',
    short: 'Poziom 1',
    subtitle: 'Poznaj AI od podstaw i zacznij wykorzystywać ją w praktyce.',
    audience: 'Dla osób, które nigdy wcześniej nie korzystały ze sztucznej inteligencji.',
    goal: 'Samodzielnie i bez stresu korzystasz z asystenta AI w prostych zadaniach.',
    icon: 'sparkles',
    color: '#34d399',
    colorSoft: 'rgb(52 211 153 / 0.14)',
    next: 'sredni',
  },
  sredni: {
    id: 'sredni',
    name: 'Średni',
    short: 'Poziom 2',
    subtitle: 'Naucz się wykorzystywać AI do coraz trudniejszych zadań.',
    audience: 'Dla osób, które prowadzą już proste rozmowy z AI i chcą pracować na dokumentach i danych.',
    goal: 'Wykorzystujesz AI do raportów, analiz danych i porządkowania dokumentacji.',
    icon: 'chart',
    color: '#facc15',
    colorSoft: 'rgb(250 204 21 / 0.13)',
    next: 'zaawansowany',
  },
  zaawansowany: {
    id: 'zaawansowany',
    name: 'Zaawansowany',
    short: 'Poziom 3',
    subtitle: 'Wykorzystaj pełny potencjał AI w swojej pracy zawodowej.',
    audience: 'Dla osób, które chcą projektować złożone instrukcje, własnych asystentów i procesy pracy z AI.',
    goal: 'Projektujesz powtarzalne, sprawdzalne procesy pracy z AI.',
    icon: 'brain',
    color: '#f87171',
    colorSoft: 'rgb(248 113 113 / 0.13)',
  },
};

export const LEVEL_ORDER: LevelId[] = ['poczatkujacy', 'sredni', 'zaawansowany'];

export const SKILLS: Record<SkillId, { label: string; description: string }> = {
  cel: { label: 'Określanie celu', description: 'Jasno mówisz AI, co ma powstać.' },
  kontekst: { label: 'Przekazywanie kontekstu', description: 'Opisujesz sytuację, odbiorcę i tło zadania.' },
  dane: { label: 'Praca z danymi', description: 'Podajesz potrzebne fakty i wskazujesz, czego brakuje.' },
  format: { label: 'Opis oczekiwanego wyniku', description: 'Określasz formę, długość i układ odpowiedzi.' },
  ograniczenia: { label: 'Ograniczenia i styl', description: 'Ustalasz ton, zakres i zasady, których AI ma się trzymać.' },
  weryfikacja: { label: 'Sprawdzanie odpowiedzi', description: 'Wychwytujesz błędy, braki i zmyślone informacje.' },
  bezpieczenstwo: { label: 'Ochrona danych', description: 'Nie ujawniasz poufnych informacji, anonimizujesz dane.' },
  iteracja: { label: 'Rozmowa i poprawianie', description: 'Dopytujesz i doprecyzowujesz, zamiast zaczynać od nowa.' },
  struktura: { label: 'Złożone instrukcje', description: 'Dzielisz pracę na etapy, projektujesz role i procesy.' },
};

export const SKILL_ORDER: SkillId[] = [
  'cel',
  'kontekst',
  'dane',
  'format',
  'ograniczenia',
  'iteracja',
  'weryfikacja',
  'bezpieczenstwo',
  'struktura',
];

/** Pełny program nauczania. Moduły bez lekcji są przygotowaną strukturą do rozbudowy. */
export const CURRICULUM: CurriculumModule[] = [
  // POCZĄTKUJĄCY
  { id: 'p1', level: 'poczatkujacy', number: 1, title: 'Pierwsze kroki z AI', description: 'W czym AI pomaga, czego nie robi niezawodnie i jak wygląda rozmowa.', lessonIds: ['p-pierwsze-kroki'] },
  { id: 'p2', level: 'poczatkujacy', number: 2, title: 'Jak napisać pierwsze polecenie', description: 'Cel, kontekst, dane i oczekiwany wynik.', lessonIds: ['p-pierwsze-polecenie'] },
  { id: 'p3', level: 'poczatkujacy', number: 3, title: 'Dlaczego jedne prompty działają lepiej', description: 'Porównywanie dobrych i słabych przykładów.', lessonIds: ['p-pierwsze-polecenie'] },
  { id: 'p4', level: 'poczatkujacy', number: 4, title: 'Rozmowa z AI krok po kroku', description: 'Dopytywanie, poprawianie i doprecyzowywanie.', lessonIds: ['p-pierwsze-kroki'] },
  { id: 'p5', level: 'poczatkujacy', number: 5, title: 'AI w prostych zadaniach zawodowych', description: 'Wiadomości, notatki, podsumowania, organizacja pracy.', lessonIds: [] },
  { id: 'p6', level: 'poczatkujacy', number: 6, title: 'Jak sprawdzać odpowiedzi AI', description: 'Błędy, brakujące dane i zmyślone informacje.', lessonIds: ['p-sprawdzanie'] },
  { id: 'p7', level: 'poczatkujacy', number: 7, title: 'Pierwsza samodzielna misja zawodowa', description: 'Praktyczne zadanie wykonane z pomocą AI.', lessonIds: [] },
  // ŚREDNI
  { id: 's1', level: 'sredni', number: 1, title: 'Budowanie rozbudowanych promptów', description: 'Rola, kontekst, ograniczenia, struktura wyniku.', lessonIds: ['s-rozbudowane'] },
  { id: 's2', level: 'sredni', number: 2, title: 'Praca z dokumentami technicznymi', description: 'Porządkowanie notatek i dokumentacji.', lessonIds: ['s-dokumenty'] },
  { id: 's3', level: 'sredni', number: 3, title: 'Analiza i porządkowanie danych', description: 'Tabele, zestawienia, wartości źródłowe.', lessonIds: ['s-wykresy'] },
  { id: 's4', level: 'sredni', number: 4, title: 'Odczytywanie i interpretacja wykresów', description: 'Jak poprosić AI o rzetelny opis danych.', lessonIds: ['s-wykresy'] },
  { id: 's5', level: 'sredni', number: 5, title: 'Tworzenie raportów i zestawień', description: 'Struktura raportu, sekcje, długość.', lessonIds: ['s-rozbudowane'] },
  { id: 's6', level: 'sredni', number: 6, title: 'Porównywanie wariantów i argumentów', description: 'Tabele za i przeciw, kryteria porównania.', lessonIds: [] },
  { id: 's7', level: 'sredni', number: 7, title: 'Rozmowy wieloetapowe z AI', description: 'Prowadzenie AI przez kolejne kroki.', lessonIds: ['s-dokumenty'] },
  { id: 's8', level: 'sredni', number: 8, title: 'Kontrola jakości odpowiedzi', description: 'Porównywanie odpowiedzi z danymi źródłowymi.', lessonIds: ['s-wykresy'] },
  // ZAAWANSOWANY
  { id: 'z1', level: 'zaawansowany', number: 1, title: 'Zaawansowane projektowanie promptów', description: 'Precyzyjne instrukcje z kryteriami i formatem.', lessonIds: ['z-wieloetapowe'] },
  { id: 'z2', level: 'zaawansowany', number: 2, title: 'Tworzenie wieloetapowych instrukcji', description: 'Łańcuchy zadań i punkty kontrolne.', lessonIds: ['z-wieloetapowe'] },
  { id: 'z3', level: 'zaawansowany', number: 3, title: 'Budowanie własnych asystentów AI', description: 'Instrukcje stałe, zakres, zasady bezpieczeństwa.', lessonIds: ['z-asystent'] },
  { id: 'z4', level: 'zaawansowany', number: 4, title: 'Automatyzacja powtarzalnych zadań', description: 'Szablony i stałe procedury.', lessonIds: [] },
  { id: 'z5', level: 'zaawansowany', number: 5, title: 'Tworzenie bibliotek instrukcji', description: 'Szablony z polami do uzupełnienia.', lessonIds: ['z-asystent'] },
  { id: 'z6', level: 'zaawansowany', number: 6, title: 'Zaawansowana analiza dokumentów i danych', description: 'Obliczenia, jednostki, założenia.', lessonIds: ['z-testowanie'] },
  { id: 'z7', level: 'zaawansowany', number: 7, title: 'Projektowanie procesów pracy z AI', description: 'Gdzie AI pomaga, a gdzie decyduje człowiek.', lessonIds: ['z-testowanie'] },
  { id: 'z8', level: 'zaawansowany', number: 8, title: 'Testowanie poprawności wyników', description: 'Przypadki testowe i kontrola obliczeń.', lessonIds: ['z-testowanie'] },
  { id: 'z9', level: 'zaawansowany', number: 9, title: 'Samodzielny projekt końcowy', description: 'Zaprojektuj własny proces pracy z AI.', lessonIds: [] },
];
