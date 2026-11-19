/**
 * Samouczek nawigacji Duszka AI: dla każdego ekranu lista elementów do pokazania.
 * Element na ekranie oznaczony jest atrybutem data-tour="…". Działa bez połączenia z AI.
 */

export interface TourStep {
  target: string;
  title: string;
  text: string;
}

export type ScreenId =
  | 'welcome'
  | 'intro'
  | 'levels'
  | 'placement'
  | 'dashboard'
  | 'lessons'
  | 'lesson'
  | 'lab'
  | 'lab-task'
  | 'library'
  | 'library-item'
  | 'assessment'
  | 'progress'
  | 'settings';

const GHOST_STEP: TourStep = {
  target: 'ghost',
  title: 'Duszek AI — pomoc',
  text: 'Gdy czegoś nie rozumiesz, kliknij mnie. Pokażę ekran, wyjaśnię zadanie, dam wskazówkę albo wytłumaczę pojęcie.',
};

export const TOURS: Record<ScreenId, TourStep[]> = {
  welcome: [
    { target: 'start-button', title: 'Zacznij tutaj', text: 'Kliknij „Rozpocznij”, aby wybrać poziom i zacząć naukę.' },
    GHOST_STEP,
  ],
  intro: [
    { target: 'intro-skip', title: 'Pominięcie wprowadzenia', text: 'Wprowadzenie jest opcjonalne. „Pomiń” od razu przenosi do wyboru poziomu.' },
    { target: 'intro-next', title: 'Dalej', text: 'Przechodzi do kolejnej planszy wprowadzenia.' },
  ],
  levels: [
    { target: 'level-cards', title: 'Trzy poziomy', text: 'Zielony — początkujący, żółty — średni, czerwony — zaawansowany. Możesz zacząć od dowolnego i zmienić go w każdej chwili.' },
    { target: 'placement-link', title: 'Nie wiesz, od czego zacząć?', text: 'Krótki test (ok. 2 minuty) zasugeruje poziom na podstawie Twoich odpowiedzi.' },
    GHOST_STEP,
  ],
  placement: [{ target: 'placement-question', title: 'Pytanie', text: 'Wybierz odpowiedź, która najlepiej pasuje. Wynik to tylko sugestia.' }],
  dashboard: [
    { target: 'continue-card', title: 'Kontynuuj naukę', text: 'Najważniejszy przycisk: prowadzi do kolejnej lekcji albo do miejsca, w którym skończyłeś.' },
    { target: 'level-chip', title: 'Twój poziom', text: 'Tu widzisz aktualny poziom. Kliknij, aby go zmienić.' },
    { target: 'progress-summary', title: 'Postęp', text: 'Pasek pokazuje ukończone lekcje na tym poziomie.' },
    { target: 'lab-card', title: 'Laboratorium promptów', text: 'Ćwiczenia praktyczne: piszesz polecenie i od razu dostajesz ocenę oraz wskazówki.' },
    { target: 'assessment-card', title: 'Oceń moje osiągnięcia', text: 'Krótki sprawdzian pokaże, czy jesteś gotowy na kolejny poziom.' },
    { target: 'main-nav', title: 'Menu', text: 'Stąd przejdziesz do lekcji, laboratorium, biblioteki promptów i swoich postępów.' },
    { target: 'ai-status', title: 'Tryb oceny', text: 'Pokazuje, czy ocena promptów korzysta z modelu AI, czy działa w trybie demonstracyjnym (bez AI).' },
    GHOST_STEP,
  ],
  lessons: [
    { target: 'level-tabs', title: 'Poziomy', text: 'Przełączaj poziomy, aby zobaczyć ich lekcje. Żaden poziom nie jest zablokowany.' },
    { target: 'lesson-list', title: 'Lekcje', text: 'Każda lekcja trwa ok. 5–8 minut. Zielony znacznik oznacza lekcję ukończoną.' },
  ],
  lesson: [
    { target: 'lesson-back', title: 'Powrót', text: 'Wraca do listy lekcji. Postęp zapisuje się automatycznie — wrócisz w to samo miejsce.' },
    { target: 'stage-tracker', title: 'Etapy lekcji', text: 'Każda lekcja ma te same etapy: Zobacz, Porównaj, Spróbuj, Informacja zwrotna, Popraw, Zapamiętaj.' },
    { target: 'lesson-content', title: 'Zadanie', text: 'Tu czytasz i wykonujesz ćwiczenia. Jedno zadanie na raz.' },
    { target: 'lesson-next', title: 'Dalej', text: 'Gdy wykonasz zadanie, przejdź dalej tym przyciskiem.' },
    GHOST_STEP,
  ],
  lab: [
    { target: 'lab-recommend', title: 'Polecane dla Ciebie', text: 'Na podstawie Twoich wyników aplikacja proponuje ćwiczenie, które pomoże najbardziej.' },
    { target: 'lab-list', title: 'Ćwiczenia', text: 'Wybierz dowolne zadanie. Kolor paska oznacza poziom trudności.' },
  ],
  'lab-task': [
    { target: 'task-card', title: 'Zadanie', text: 'Przeczytaj zadanie i materiały. Dane są fikcyjne — możesz je skopiować do prawdziwego asystenta AI.' },
    { target: 'prompt-input', title: 'Twój prompt', text: 'Napisz tu polecenie dla AI własnymi słowami.' },
    { target: 'check-button', title: 'Sprawdź', text: 'Ocena pokaże, co jest dobre, czego brakuje i jak to poprawić.' },
    { target: 'eval-mode', title: 'Tryb oceny', text: 'Oznaczenie mówi, czy ocenia model AI, czy prosta ocena demonstracyjna oparta na regułach.' },
  ],
  library: [
    { target: 'library-categories', title: 'Kategorie', text: 'Wybierz obszar pracy, aby zawęzić listę.' },
    { target: 'library-list', title: 'Gotowe prompty', text: 'Otwórz prompt, uzupełnij pola swoimi danymi i skopiuj do asystenta AI.' },
  ],
  'library-item': [
    { target: 'library-fields', title: 'Uzupełnij pola', text: 'Wpisz swoje dane — bez danych osobowych. Puste pola zostaną oznaczone w nawiasach.' },
    { target: 'library-preview', title: 'Podgląd', text: 'Tu widzisz gotowe polecenie. Możesz je też edytować.' },
    { target: 'library-copy', title: 'Kopiuj', text: 'Skopiuj polecenie i wklej je do asystenta AI.' },
  ],
  assessment: [
    { target: 'assessment-progress', title: 'Postęp sprawdzianu', text: 'Sprawdzian ma 5 części. Pasek pokazuje, ile już za Tobą.' },
    { target: 'assessment-content', title: 'Zadanie', text: 'Wykonaj zadanie i przejdź dalej. Wynik zobaczysz na końcu.' },
  ],
  progress: [
    { target: 'skills-panel', title: 'Twoje umiejętności', text: 'Pokazuje, jak radzisz sobie w poszczególnych umiejętnościach — na podstawie wyników ćwiczeń.' },
    { target: 'badges-panel', title: 'Odznaki', text: 'Zdobywasz je za konkretne osiągnięcia. Bez presji — w swoim tempie.' },
  ],
  settings: [
    { target: 'settings-motion', title: 'Animacje i tekst', text: 'Możesz ograniczyć animacje i powiększyć tekst.' },
    { target: 'settings-install', title: 'Instalacja', text: 'Zainstaluj aplikację na komputerze lub telefonie — będzie działać także bez Internetu.' },
  ],
};
