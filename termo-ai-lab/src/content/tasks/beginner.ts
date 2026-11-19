import type { PromptTask } from '../types';
import { AWARIA_KWIATOWA } from '../materials';

/**
 * Zadania trenażera — poziom początkujący.
 * Rubryka: suma wag = 100. Poziomy spełnienia kryterium: brak (0), częściowo (½), spełnione (1).
 */

export const TASK_KOMUNIKAT: PromptTask = {
  id: 't-komunikat-zarzadca',
  level: 'poczatkujacy',
  kind: 'write',
  title: 'Komunikat o planowanej przerwie w dostawie ciepła',
  short: 'Przygotuj z pomocą AI profesjonalny komunikat dla zarządcy nieruchomości.',
  scenario:
    'Przygotuj z pomocą AI profesjonalny komunikat dla zarządcy nieruchomości o planowanej przerwie w dostawie ciepła. Napisz polecenie (prompt), które przekaże AI wszystko, czego potrzebuje, aby napisać dobry komunikat za pierwszym razem.',
  materials: [
    {
      title: 'Dane do komunikatu (fikcyjne)',
      copyable: true,
      content:
        'Termin: wtorek 24 listopada, 8:00–14:00\nMiejsce: budynki przy ul. Słonecznej 2, 4, 6 i 8 (Osiedle Zielone)\nPowód: wymiana zaworu odcinającego na przyłączu\nCo nie działa: ogrzewanie i ciepła woda użytkowa\nKontakt: Pogotowie ciepłownicze, tel. 993\nAdresat: zarządca nieruchomości — przekaże informację mieszkańcom',
    },
  ],
  placeholder:
    'Np. Napisz komunikat dla… Informacja dotyczy… Komunikat powinien…',
  simpleExplanation:
    'Masz napisać polecenie dla AI, a nie sam komunikat. Wyobraź sobie, że prosisz nowego kolegę: „Napisz za mnie pismo do zarządcy”. Co musisz mu powiedzieć? Do kogo pisze, kiedy i gdzie będzie przerwa, dlaczego, jak długie ma być pismo i jakim tonem.',
  hints: [
    'Zacznij od celu: napisz wprost, jaki tekst ma powstać i do kogo jest skierowany.',
    'AI nie zna terminu, adresu ani powodu przerwy. Przepisz je do polecenia albo wklej dane z ramki powyżej.',
    'Określ formę: np. „krótki e-mail, maksymalnie 6 zdań, z tematem wiadomości”. Dodaj ton: uprzejmy i rzeczowy.',
    'Na koniec pomyśl o mieszkańcach: co powinni wiedzieć, gdy coś pójdzie nie tak? Dodaj prośbę o informację kontaktową.',
  ],
  criteria: [
    {
      id: 'cel',
      skill: 'cel',
      weight: 20,
      label: 'Jasny cel',
      description: 'Polecenie mówi, jaki tekst ma powstać i czego dotyczy (komunikat o przerwie w dostawie ciepła).',
      missingPhrase: 'rodzaju tekstu, który ma przygotować',
      tip: 'Zacznij od zdania: „Napisz komunikat / e-mail o planowanej przerwie w dostawie ciepła”.',
      praise: 'Od razu wiadomo, jaki tekst ma powstać i czego dotyczy.',
      demo: {
        groups: [
          ['komunikat', 'pismo', 'wiadomosc', 'informacj', 'ogloszeni', 'mail', 'list'],
          ['przerw', 'wylaczeni', 'brak ciepl', 'brak dostaw', 'wstrzyman', 'odciec', 'nie bedzie ciepl'],
        ],
        full: 2,
      },
    },
    {
      id: 'odbiorca',
      skill: 'kontekst',
      weight: 15,
      label: 'Odbiorca',
      description: 'AI wie, że komunikat trafia do zarządcy nieruchomości (który przekaże go mieszkańcom).',
      missingPhrase: 'odbiorcy komunikatu',
      tip: 'Dopisz, do kogo jest komunikat: „dla zarządcy nieruchomości, który przekaże go mieszkańcom”.',
      praise: 'Wskazujesz odbiorcę — AI dobierze odpowiedni język.',
      demo: { groups: [['zarzadc', 'administrator', 'wspolnot', 'spoldziel', 'zarzadzajac']], full: 1 },
    },
    {
      id: 'dane',
      skill: 'dane',
      weight: 25,
      label: 'Kluczowe fakty',
      description: 'Polecenie zawiera termin, miejsce i powód przerwy (albo wklejone dane).',
      missingPhrase: 'wszystkich kluczowych faktów (termin, miejsce, powód przerwy)',
      tip: 'Przepisz termin (dzień i godziny), adresy budynków oraz powód prac. AI nie może ich zgadnąć.',
      praise: 'Podajesz konkretne fakty — AI nie musi niczego wymyślać.',
      demo: {
        groups: [
          ['termin', 'dnia', 'godzin', 'wtorek', 'listopad', '\\d{1,2}[:.]\\d{2}', '\\d{1,2}\\s*-\\s*\\d{1,2}'],
          ['adres', 'ul\\.', 'ulic', 'budyn', 'sloneczn', 'osiedl'],
          ['powod', 'przyczyn', 'wymian', 'remont', 'prac', 'napraw', 'zawor', 'modernizac'],
        ],
        full: 3,
      },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 20,
      label: 'Forma i długość',
      description: 'Określona forma (np. e-mail z tematem) i długość tekstu.',
      missingPhrase: 'oczekiwanej formy i długości tekstu',
      tip: 'Dodaj np. „w formie e-maila z tematem, maksymalnie 6 zdań”.',
      praise: 'Określasz formę i długość — wynik będzie gotowy do wysłania.',
      demo: {
        groups: [
          ['krotk', 'zwiezl', 'zdan', 'akapit', 'slow', 'dlugos', 'maksymaln', 'do \\d+', 'punkt'],
          ['temat', 'tytul', 'naglow', 'format', 'w formie', 'struktur', 'podpis', 'e-mail', 'mail'],
        ],
        full: 2,
      },
    },
    {
      id: 'ton',
      skill: 'ograniczenia',
      weight: 10,
      label: 'Ton',
      description: 'Wskazany styl: uprzejmy, rzeczowy, profesjonalny.',
      missingPhrase: 'tonu wypowiedzi',
      tip: 'Dopisz: „ton uprzejmy i rzeczowy, bez technicznego żargonu”.',
      praise: 'Określasz ton — komunikat będzie brzmiał profesjonalnie.',
      demo: {
        groups: [['uprzejm', 'profesjonaln', 'rzeczow', 'formaln', 'zyczliw', 'ton', 'styl', 'przeprasz', 'spokojn', 'zargon']],
        full: 1,
      },
    },
    {
      id: 'praktyczne',
      skill: 'kontekst',
      weight: 10,
      label: 'Informacje praktyczne',
      description: 'Prośba o dane kontaktowe lub wskazówki dla mieszkańców.',
      missingPhrase: 'informacji kontaktowych dla mieszkańców',
      tip: 'Poproś, aby komunikat zawierał numer kontaktowy (np. 993) i prośbę o przekazanie informacji mieszkańcom.',
      praise: 'Pamiętasz o mieszkańcach — wiedzą, gdzie dzwonić.',
      demo: {
        groups: [['kontakt', 'telefon', '993', 'dyspozytor', 'pogotow', 'przekaz', 'wywiesz', 'mieszkan', 'lokator']],
        full: 1,
      },
    },
  ],
  examplePrompt:
    'Napisz komunikat o planowanej przerwie w dostawie ciepła dla zarządcy nieruchomości, który przekaże go mieszkańcom.\n\nDane:\n– termin: wtorek 24 listopada, 8:00–14:00,\n– budynki: ul. Słoneczna 2, 4, 6 i 8,\n– powód: wymiana zaworu odcinającego na przyłączu,\n– w tym czasie nie będzie ogrzewania ani ciepłej wody,\n– kontakt: Pogotowie ciepłownicze, tel. 993.\n\nForma: e-mail z tematem, maksymalnie 6 zdań. Ton uprzejmy i rzeczowy, bez technicznego żargonu. Na końcu poproś zarządcę o wywieszenie informacji na klatkach schodowych.',
  exampleWhy: [
    'Cel i odbiorca są w pierwszym zdaniu.',
    'Wszystkie fakty podane są w czytelnej liście — AI nie musi zgadywać.',
    'Forma, długość i ton są określone, więc wynik nadaje się do wysłania.',
    'Polecenie pamięta o mieszkańcach: kontakt i prośba o wywieszenie informacji.',
  ],
  verifyTip:
    'Zanim wyślesz komunikat, porównaj z danymi: datę, godziny, adresy i numer telefonu. AI czasem zmienia szczegóły.',
  minWords: 8,
};

export const TASK_NAPRAW_AWARIA: PromptTask = {
  id: 't-napraw-awaria',
  level: 'poczatkujacy',
  kind: 'fix',
  title: 'Napraw nieudane polecenie: analiza awarii',
  short: 'Przekształć polecenie „Przeanalizuj tę awarię” w precyzyjną instrukcję.',
  scenario:
    'Kolega wkleił do AI notatkę z awarii i napisał tylko: „Przeanalizuj tę awarię”. Dostał długi, ogólny tekst z przypuszczeniami. Popraw jego polecenie: wskaż, z jakich danych AI ma korzystać, co dokładnie ma przygotować i że ma zaznaczać informacje niepewne lub brakujące.',
  brokenPrompt: 'Przeanalizuj tę awarię.',
  materials: [{ title: AWARIA_KWIATOWA.title, content: AWARIA_KWIATOWA.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Na podstawie poniższej notatki przygotuj…',
  simpleExplanation:
    'Polecenie „Przeanalizuj tę awarię” jest za krótkie: AI nie wie, czego od niej chcesz — streszczenia? przyczyn? zaleceń? Twoim zadaniem jest dopisać, co ma powstać, na podstawie czego i co AI ma zrobić, gdy czegoś nie wie.',
  hints: [
    'Napisz, co ma powstać: np. krótkie podsumowanie, chronologia zdarzeń, lista działań do wykonania.',
    'Wskaż źródło: „na podstawie poniższej notatki”. To ogranicza wymyślanie.',
    'Najważniejsze: poproś AI, aby zaznaczała, czego nie wiadomo (np. przyczyna jest wstępna) i nie dodawała faktów spoza notatki.',
    'Dodaj formę: np. „w punktach, maksymalnie 10 punktów” i do czego posłuży wynik (np. raport dla kierownika).',
  ],
  criteria: [
    {
      id: 'cel',
      skill: 'cel',
      weight: 20,
      label: 'Co ma powstać',
      description: 'Określony rezultat: podsumowanie, chronologia, wnioski lub lista działań.',
      missingPhrase: 'tego, jaki rezultat ma przygotować',
      tip: 'Zamiast „przeanalizuj” napisz np. „przygotuj chronologię zdarzeń i listę działań do wykonania”.',
      praise: 'Jasno opisujesz, jaki rezultat ma powstać.',
      demo: {
        groups: [
          ['podsumow', 'chronolog', 'os czasu', 'przebieg', 'kolejnosc zdarzen', 'streszcz', 'zestawien'],
          ['wniosk', 'rekomend', 'dzialan', 'zalec', 'co poprawic', 'przyczyn', 'lista'],
        ],
        full: 2,
      },
    },
    {
      id: 'zrodlo',
      skill: 'dane',
      weight: 25,
      label: 'Źródło danych',
      description: 'Polecenie wskazuje, że AI ma pracować na dołączonej notatce.',
      missingPhrase: 'tego, na jakich danych ma pracować',
      tip: 'Dopisz: „na podstawie poniższej notatki z awarii” i wklej notatkę pod poleceniem.',
      praise: 'Wskazujesz źródło danych — AI wie, na czym ma pracować.',
      demo: {
        groups: [['notatk', 'ponizsz', 'zalaczon', 'dane', 'tekst', 'raport', 'na podstawie', 'wklej', 'dolacz', 'informacj']],
        full: 1,
      },
    },
    {
      id: 'niepewnosc',
      skill: 'weryfikacja',
      weight: 25,
      label: 'Niepewność i brak zmyślania',
      description: 'AI ma korzystać tylko z notatki i zaznaczać informacje niepewne lub brakujące.',
      missingPhrase: 'tego, że ma zaznaczać niepewne i brakujące informacje',
      tip: 'Dopisz: „Korzystaj wyłącznie z notatki. Jeśli czegoś brakuje lub jest niepewne, wyraźnie to zaznacz”.',
      praise: 'Chronisz się przed zmyślaniem — AI ma zaznaczać niepewności.',
      demo: {
        groups: [
          ['tylko na podstawie', 'wylacznie', 'tylko z', 'tylko informacj', 'nie wymyslaj', 'nie zgaduj', 'nie dodawaj', 'nie dopowiadaj', 'nie spekul'],
          ['zaznacz', 'oznacz', 'niepewn', 'brak danych', 'brakuj', 'do potwierdzenia', 'hipotez', 'nie wiadomo', 'luk', 'wstepn'],
        ],
        full: 2,
      },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 20,
      label: 'Forma wyniku',
      description: 'Określona forma i długość: punkty, tabela, sekcje.',
      missingPhrase: 'formy wyniku',
      tip: 'Dodaj np. „w punktach, maksymalnie 10 punktów” albo „w tabeli: godzina – zdarzenie”.',
      praise: 'Określasz formę — wynik będzie czytelny.',
      demo: {
        groups: [['tabel', 'punkt', 'list', 'sekcj', 'naglow', 'akapit', 'zdan', 'krotk', 'maksymaln', 'struktur', 'kolumn']],
        full: 1,
      },
    },
    {
      id: 'zastosowanie',
      skill: 'kontekst',
      weight: 10,
      label: 'Do czego posłuży wynik',
      description: 'AI wie, dla kogo lub do czego jest analiza (np. raport dla kierownika).',
      missingPhrase: 'celu wykorzystania analizy',
      tip: 'Dopisz np. „wynik trafi do raportu dla kierownika działu eksploatacji”.',
      praise: 'AI wie, do czego posłuży wynik — dobierze poziom szczegółów.',
      demo: {
        groups: [['kierownik', 'przelozon', 'raport dla', 'zarzad', 'dzial', 'do raportu', 'spotkani', 'odpraw', 'notatk sluzbow', 'dokumentacj', 'zespol']],
        full: 1,
      },
    },
  ],
  examplePrompt:
    'Na podstawie poniższej notatki z awarii przygotuj dla kierownika działu eksploatacji:\n1) chronologię zdarzeń w tabeli (godzina – zdarzenie),\n2) listę 3–5 działań do wykonania.\n\nKorzystaj wyłącznie z informacji w notatce. Jeśli czegoś brakuje lub informacja jest niepewna (np. wstępna przyczyna), wyraźnie to zaznacz zamiast zgadywać. Całość na maksymalnie pół strony.\n\n[tu wklejam notatkę]',
  exampleWhy: [
    'Jasno wiadomo, co ma powstać (chronologia + działania) i dla kogo.',
    'Polecenie ogranicza AI do treści notatki.',
    'AI ma zaznaczać niepewności — przyczyna awarii jest w notatce tylko wstępna.',
    'Forma i długość są określone.',
  ],
  verifyTip:
    'Sprawdź każdą godzinę i liczbę w odpowiedzi z notatką. Upewnij się, że AI nie podała przyczyny jako pewnej.',
  minWords: 10,
};
