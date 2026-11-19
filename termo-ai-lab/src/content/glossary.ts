/** Słownik pojęć — Duszek AI: „Wyjaśnij mi to pojęcie”. Działa offline. */

export interface GlossaryTerm {
  id: string;
  term: string;
  short: string;
  example: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'prompt',
    term: 'Prompt (polecenie)',
    short: 'Polecenie lub instrukcja, którą wpisujesz do AI. Im jaśniej opiszesz cel, kontekst, dane i oczekiwany wynik, tym lepsza odpowiedź.',
    example: '„Napisz e-mail do zarządcy o przerwie w dostawie ciepła 24 listopada w godz. 8–14, maks. 6 zdań.”',
  },
  {
    id: 'asystent',
    term: 'Asystent AI',
    short: 'Program, z którym rozmawiasz zwykłym językiem (np. ChatGPT, Claude, Microsoft Copilot). Tworzy teksty, streszczenia, tabele i odpowiada na pytania.',
    example: 'Prosisz asystenta o uporządkowanie notatek z obchodu w tabelę.',
  },
  {
    id: 'model',
    term: 'Model językowy',
    short: 'Silnik asystenta AI. Nauczył się języka na ogromnej liczbie tekstów i przewiduje, jak najlepiej kontynuować tekst. Nie „wie” rzeczy jak człowiek — dlatego może się mylić.',
    example: 'Model zna typowe przyczyny wycieków, ale nie wie, co stało się na Twojej sieci w zeszłym tygodniu.',
  },
  {
    id: 'kontekst',
    term: 'Kontekst',
    short: 'Informacje o sytuacji, które dajesz AI: kto jest odbiorcą, czego dotyczy sprawa, co już wiadomo.',
    example: '„Sprawdziliśmy węzeł — parametry prawidłowe, problem w instalacji wewnętrznej budynku.”',
  },
  {
    id: 'halucynacja',
    term: 'Halucynacja (zmyślenie)',
    short: 'Sytuacja, gdy AI podaje nieprawdziwą informację tak, jakby była pewna — np. nieistniejący przepis lub liczbę.',
    example: 'AI pisze, że awarię spowodował wykonawca, choć w notatce nie ma o tym ani słowa.',
  },
  {
    id: 'weryfikacja',
    term: 'Weryfikacja',
    short: 'Sprawdzenie odpowiedzi AI ze źródłem: liczby, daty, nazwy, wnioski. Nie polega na pytaniu AI, czy jest pewna.',
    example: 'Porównujesz średnią podaną przez AI z obliczeniem w arkuszu.',
  },
  {
    id: 'anonimizacja',
    term: 'Anonimizacja',
    short: 'Usunięcie lub zastąpienie danych, które pozwalają zidentyfikować osobę (imię, nazwisko, telefon, adres, PESEL), zanim wkleisz tekst do AI.',
    example: '„Pan Jan Kowalski, tel. 600…” → „[ODBIORCA]”.',
  },
  {
    id: 'rola',
    term: 'Rola w promptcie',
    short: 'Wskazanie AI perspektywy, z której ma pisać, np. „Jesteś specjalistą ds. eksploatacji”. Pomaga dobrać język, ale nie czyni AI nieomylną.',
    example: '„Jesteś specjalistą ds. eksploatacji sieci ciepłowniczej. Przygotuj szkic raportu…”',
  },
  {
    id: 'format',
    term: 'Format wyniku',
    short: 'Opis, jak ma wyglądać odpowiedź: tabela, punkty, sekcje, długość, ton.',
    example: '„Tabela: godzina – zdarzenie. Maksymalnie pół strony.”',
  },
  {
    id: 'iteracja',
    term: 'Rozmowa wieloetapowa (iteracja)',
    short: 'Poprawianie wyniku kolejnymi wiadomościami w tej samej rozmowie, zamiast zaczynania od nowa.',
    example: '„Skróć do 5 zdań i usuń zdanie o obowiązkowej obecności.”',
  },
  {
    id: 'punkt-kontrolny',
    term: 'Punkt kontrolny',
    short: 'Miejsce w instrukcji wieloetapowej, w którym AI zatrzymuje się i czeka na akceptację człowieka.',
    example: '„Po etapie 1 pokaż tabelę i poczekaj, aż napiszę OK.”',
  },
  {
    id: 'instrukcja-stala',
    term: 'Instrukcja stała (systemowa)',
    short: 'Stałe zasady dla własnego asystenta AI: rola, zakres, granice, format, ochrona danych. Asystent stosuje je w każdej rozmowie.',
    example: 'Instrukcja asystenta dyspozytorni: „Przygotowujesz tylko projekty komunikatów; zatwierdza je dyspozytor.”',
  },
  {
    id: 'okno-kontekstu',
    term: 'Okno kontekstu',
    short: 'Ilość tekstu, którą AI może „mieć przed oczami” w jednej rozmowie. Bardzo długie rozmowy lub dokumenty mogą wykraczać poza ten limit — wtedy AI może pominąć wcześniejsze informacje.',
    example: 'W bardzo długiej rozmowie warto co jakiś czas przypomnieć najważniejsze ustalenia.',
  },
  {
    id: 'szablon',
    term: 'Szablon promptu',
    short: 'Gotowe polecenie z polami do uzupełnienia, np. [TERMIN], [ADRESY]. Pozwala zespołowi pracować według jednego standardu.',
    example: 'Szablon komunikatu o przerwie w dostawie ciepła w Bibliotece promptów.',
  },
  {
    id: 'dane-wrazliwe',
    term: 'Dane wrażliwe i poufne',
    short: 'Dane osobowe, hasła, informacje o zabezpieczeniach infrastruktury, poufne umowy. Nie wklejaj ich do narzędzi AI, które nie są zatwierdzone w firmie do takich danych.',
    example: 'Schemat zabezpieczeń ciepłowni nie powinien trafić do publicznego czatu AI.',
  },
];
