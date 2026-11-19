import type { PromptTask } from '../types';
import { ODCZYTY_LICZNIKA, PROTOKOL_ODBIORU } from '../materials';

/**
 * Ćwiczenia celowane — krótkie zadania typu „napraw polecenie”, każde skupione na jednej umiejętności.
 * Aplikacja proponuje je automatycznie, gdy ta sama umiejętność kilka razy wypada słabo.
 */

export const DRILL_CEL: PromptTask = {
  id: 'd-cel',
  level: 'poczatkujacy',
  kind: 'fix',
  focusSkill: 'cel',
  title: 'Ćwiczenie celowane: jasny cel',
  short: 'Zamień niejasne polecenie w takie, z którego od razu wiadomo, co ma powstać.',
  scenario:
    'Chcesz wysłać zespołowi monterów przypomnienie o harmonogramie corocznych przeglądów węzłów cieplnych w grudniu. Popraw polecenie tak, aby AI od razu wiedziała, jaki tekst ma powstać, dla kogo i w jakiej formie.',
  brokenPrompt: 'Napisz coś o przeglądach węzłów.',
  placeholder: 'Np. Napisz e-mail do…',
  simpleExplanation:
    '„Napisz coś” nie mówi AI, czego chcesz. Napisz wprost: jaki tekst (np. e-mail z przypomnieniem), do kogo (zespół monterów) i jaki ma być (krótki, z listą terminów).',
  hints: [
    'Nazwij rodzaj tekstu: e-mail, przypomnienie, komunikat.',
    'Powiedz, czego dotyczy: harmonogram przeglądów węzłów w grudniu.',
    'Dodaj odbiorcę i formę: zespół monterów, krótko, terminy w punktach.',
  ],
  criteria: [
    {
      id: 'cel',
      skill: 'cel',
      weight: 50,
      label: 'Jasny cel',
      description: 'Wiadomo, jaki tekst ma powstać i czego dotyczy.',
      missingPhrase: 'rodzaju tekstu i tematu',
      tip: 'Napisz np. „Napisz e-mail z przypomnieniem o harmonogramie przeglądów węzłów w grudniu”.',
      praise: 'Cel jest jasny od pierwszego zdania.',
      demo: {
        groups: [
          ['e-mail', 'mail', 'wiadomosc', 'przypomni', 'komunikat', 'informacj'],
          ['harmonogram', 'termin', 'grudzien', 'grudni', 'plan'],
        ],
        full: 2,
      },
    },
    {
      id: 'odbiorca',
      skill: 'kontekst',
      weight: 25,
      label: 'Odbiorca',
      description: 'Wskazany odbiorca: zespół monterów.',
      missingPhrase: 'odbiorcy',
      tip: 'Dopisz, do kogo jest wiadomość: „do zespołu monterów”.',
      praise: 'Wskazujesz odbiorcę.',
      demo: { groups: [['zespol', 'brygad', 'pracownik', 'monter', 'kolegow', 'ekip']], full: 1 },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 25,
      label: 'Forma',
      description: 'Określona forma lub długość.',
      missingPhrase: 'formy wiadomości',
      tip: 'Dodaj np. „krótko, terminy w punktach, z tematem wiadomości”.',
      praise: 'Określasz formę.',
      demo: { groups: [['krotk', 'zdan', 'punkt', 'list', 'tabel', 'temat', 'zwiezl', 'maksymaln']], full: 1 },
    },
  ],
  examplePrompt:
    'Napisz krótki e-mail do zespołu monterów z przypomnieniem o harmonogramie corocznych przeglądów węzłów cieplnych w grudniu. Terminy przedstaw w punktach (wkleję je poniżej), dodaj temat wiadomości i prośbę o zgłaszanie kolizji terminów do piątku.',
  exampleWhy: ['Rodzaj tekstu, temat i odbiorca są w jednym zdaniu.', 'Forma jest określona: krótko, punkty, temat.'],
  verifyTip: 'Sprawdź, czy AI nie dopisała terminów, których nie podałeś.',
  minWords: 8,
};

export const DRILL_KONTEKST: PromptTask = {
  id: 'd-kontekst',
  level: 'poczatkujacy',
  kind: 'fix',
  focusSkill: 'kontekst',
  title: 'Ćwiczenie celowane: kontekst',
  short: 'Dodaj do polecenia sytuację, bez której AI napisze ogólnik.',
  scenario:
    'Mieszkaniec skarży się na zbyt niską temperaturę w mieszkaniu. Sprawdziliście węzeł cieplny budynku — parametry są prawidłowe, a problem leży w instalacji wewnętrznej budynku, za którą odpowiada zarządca. Popraw polecenie, aby AI znała tę sytuację.',
  brokenPrompt: 'Napisz odpowiedź na skargę.',
  placeholder: 'Np. Mieszkaniec zgłosił… Sprawdziliśmy…',
  simpleExplanation:
    'AI nie wie, czego dotyczyła skarga ani co już ustaliliście. Opisz sytuację w 2–3 zdaniach: co zgłoszono, co sprawdziliście, jaki był wynik i kto odpowiada za dalsze działania.',
  hints: [
    'Opisz skargę: zbyt niska temperatura w mieszkaniu.',
    'Dodaj, co sprawdziliście i z jakim wynikiem: parametry w węźle prawidłowe.',
    'Wskaż, kto odpowiada za dalsze działania: instalacja wewnętrzna — zarządca budynku.',
  ],
  criteria: [
    {
      id: 'kontekst',
      skill: 'kontekst',
      weight: 50,
      label: 'Opis sytuacji',
      description: 'Polecenie opisuje skargę, wykonane sprawdzenie i jego wynik.',
      missingPhrase: 'sytuacji, której dotyczy skarga',
      tip: 'Dopisz: co zgłoszono, co sprawdziliście w węźle i że problem dotyczy instalacji wewnętrznej (zarządca).',
      praise: 'AI zna pełną sytuację — odpowiedź będzie konkretna.',
      demo: {
        groups: [
          ['skarg', 'reklamac', 'zgloszen', 'zglosil', 'zglosila'],
          ['temperatur', 'zimno', 'nisk', 'chlod'],
          ['wezel', 'wezl', 'sprawdz', 'pomiar', 'parametr'],
          ['instalacj wewnetrzn', 'wewnetrzn', 'zarzadc', 'administrator', 'po stronie budynku'],
        ],
        full: 3,
      },
    },
    {
      id: 'ton',
      skill: 'ograniczenia',
      weight: 25,
      label: 'Ton',
      description: 'Uprzejmy, empatyczny, rzeczowy.',
      missingPhrase: 'tonu odpowiedzi',
      tip: 'Dopisz: „ton uprzejmy i rzeczowy, ze zrozumieniem dla mieszkańca”.',
      praise: 'Dbasz o ton.',
      demo: { groups: [['uprzejm', 'zyczliw', 'empat', 'profesjonaln', 'rzeczow', 'spokojn', 'przeprasz', 'zrozumien', 'ton']], full: 1 },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 25,
      label: 'Forma',
      description: 'Forma i długość odpowiedzi.',
      missingPhrase: 'formy odpowiedzi',
      tip: 'Dodaj np. „krótki e-mail, maksymalnie 6 zdań, z sugestią kontaktu z zarządcą”.',
      praise: 'Określasz formę odpowiedzi.',
      demo: { groups: [['krotk', 'zdan', 'akapit', 'list', 'e-mail', 'mail', 'pismo', 'slow', 'maksymaln']], full: 1 },
    },
  ],
  examplePrompt:
    'Napisz odpowiedź na skargę mieszkańca, który zgłosił zbyt niską temperaturę w mieszkaniu. Sprawdziliśmy węzeł cieplny budynku — parametry są prawidłowe. Problem dotyczy instalacji wewnętrznej, za którą odpowiada zarządca budynku. Wyjaśnij to prostym językiem i zasugeruj kontakt z zarządcą. Ton uprzejmy i rzeczowy, krótki e-mail, maks. 6 zdań.',
  exampleWhy: ['AI zna skargę, wynik sprawdzenia i podział odpowiedzialności.', 'Ton i forma są określone.'],
  verifyTip: 'Upewnij się, że odpowiedź nie obiecuje działań, których nie wykonacie.',
  minWords: 12,
};

export const DRILL_DANE: PromptTask = {
  id: 'd-dane',
  level: 'sredni',
  kind: 'fix',
  focusSkill: 'dane',
  title: 'Ćwiczenie celowane: dane',
  short: 'Przekaż AI dane potrzebne do obliczeń — z jednostkami i okresem.',
  scenario:
    'Chcesz obliczyć zużycie ciepła w węźle W-18 w październiku i listopadzie na podstawie odczytów licznika. Popraw polecenie, aby AI miała dane, jednostki i okresy oraz pokazała obliczenia.',
  brokenPrompt: 'Policz zużycie ciepła.',
  materials: [{ title: ODCZYTY_LICZNIKA.title, content: ODCZYTY_LICZNIKA.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Na podstawie odczytów licznika…',
  simpleExplanation:
    'AI nie zna odczytów licznika. Musisz je podać (albo wkleić), wskazać jednostkę (GJ) i okresy, a także poprosić o pokazanie obliczeń.',
  hints: [
    'Wklej odczyty licznika albo przepisz je do polecenia.',
    'Podaj jednostkę (GJ) i okresy: październik, listopad.',
    'Poproś o pokazanie obliczeń i wynik w tabeli.',
  ],
  criteria: [
    {
      id: 'dane',
      skill: 'dane',
      weight: 50,
      label: 'Dane, jednostki, okres',
      description: 'Polecenie zawiera lub wskazuje odczyty, jednostki i okresy.',
      missingPhrase: 'odczytów licznika, jednostek i okresów',
      tip: 'Dopisz: „Odczyty licznika [GJ]: 1.10 – 12 480,5; 1.11 – 12 742,9; 1.12 – 13 118,2”.',
      praise: 'AI ma komplet danych.',
      demo: {
        groups: [
          ['ponizsz', 'zalaczon', 'dane', 'odczyt', 'stan licznika', 'wskazan'],
          ['gj', 'mwh', 'jednost'],
          ['okres', 'miesi', 'pazdziernik', 'listopad', 'od \\d', 'dat'],
        ],
        full: 2,
      },
    },
    {
      id: 'obliczenia',
      skill: 'weryfikacja',
      weight: 25,
      label: 'Pokazane obliczenia',
      description: 'AI ma pokazać, jak liczy.',
      missingPhrase: 'prośby o pokazanie obliczeń',
      tip: 'Dodaj: „Pokaż obliczenia dla każdego miesiąca”.',
      praise: 'Prosisz o pokazanie obliczeń.',
      demo: { groups: [['pokaz', 'krok', 'wzor', 'rozpisz', 'jak oblicz']], full: 1 },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 25,
      label: 'Forma wyniku',
      description: 'Wynik w tabeli lub zestawieniu.',
      missingPhrase: 'formy wyniku',
      tip: 'Dodaj: „Wynik przedstaw w tabeli: miesiąc – zużycie [GJ]”.',
      praise: 'Określasz formę wyniku.',
      demo: { groups: [['tabel', 'list', 'punkt', 'zestawien', 'kolumn']], full: 1 },
    },
  ],
  examplePrompt:
    'Na podstawie odczytów licznika ciepła w węźle W-18 oblicz zużycie ciepła [GJ] w październiku i listopadzie.\nOdczyty: 1.10 – 12 480,5 GJ; 1.11 – 12 742,9 GJ; 1.12 – 13 118,2 GJ.\nPokaż obliczenia dla każdego miesiąca, a wynik zestaw w tabeli: miesiąc – zużycie [GJ].',
  exampleWhy: ['Dane, jednostki i okresy są kompletne.', 'Obliczenia będą widoczne i łatwe do sprawdzenia.'],
  verifyTip: 'Wynik referencyjny: październik 262,4 GJ, listopad 375,3 GJ.',
  referenceFacts: [
    { label: 'Zużycie w październiku', value: '262,4', unit: 'GJ', alternatives: ['262.4'] },
    { label: 'Zużycie w listopadzie', value: '375,3', unit: 'GJ', alternatives: ['375.3'] },
  ],
  minWords: 10,
};

export const DRILL_FORMAT: PromptTask = {
  id: 'd-format',
  level: 'sredni',
  kind: 'fix',
  focusSkill: 'format',
  title: 'Ćwiczenie celowane: forma wyniku',
  short: 'Określ dokładnie, jak ma wyglądać odpowiedź.',
  scenario:
    'Kierownik prosi o krótkie streszczenie protokołu odbioru przyłącza — chce w minutę wiedzieć, jaka jest decyzja i jakie usterki trzeba usunąć. Popraw polecenie tak, aby AI wiedziała, jak ma wyglądać wynik.',
  brokenPrompt: 'Streść ten protokół.',
  materials: [{ title: PROTOKOL_ODBIORU.title, content: PROTOKOL_ODBIORU.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Streść poniższy protokół w…',
  simpleExplanation:
    'Streszczenie może mieć jedno zdanie albo dwie strony. Powiedz AI, jak ma wyglądać: ile punktów, czy tabela, co ma być na początku.',
  hints: [
    'Określ liczbę punktów lub długość: np. „maksymalnie 5 punktów”.',
    'Zaproponuj układ: decyzja komisji na początku, potem tabela usterek z terminem.',
    'Wskaż odbiorcę: kierownik, który ma minutę na lekturę.',
  ],
  criteria: [
    {
      id: 'format',
      skill: 'format',
      weight: 50,
      label: 'Układ i długość',
      description: 'Określony układ (punkty, tabela) i długość.',
      missingPhrase: 'układu i długości streszczenia',
      tip: 'Dopisz: „Na początku decyzja komisji w 1 zdaniu, potem tabela: usterka – termin usunięcia. Maks. 5 punktów”.',
      praise: 'Układ i długość są dokładnie określone.',
      demo: {
        groups: [
          ['punkt', 'list', 'tabel', 'sekcj', 'naglow', 'kolumn'],
          ['\\d+ punkt', '\\d+ zdan', 'krotk', 'zwiezl', 'maksymaln', 'do \\d+', 'slow', 'strona', 'jedno zdani'],
        ],
        full: 2,
      },
    },
    {
      id: 'odbiorca',
      skill: 'kontekst',
      weight: 25,
      label: 'Odbiorca',
      description: 'Wiadomo, kto przeczyta streszczenie.',
      missingPhrase: 'odbiorcy streszczenia',
      tip: 'Dopisz: „dla kierownika, który potrzebuje informacji w minutę”.',
      praise: 'Wskazujesz odbiorcę.',
      demo: { groups: [['kierownik', 'przelozon', 'zarzad', 'dyrektor', 'zespol', 'inwestor', 'szef']], full: 1 },
    },
    {
      id: 'wiernosc',
      skill: 'weryfikacja',
      weight: 25,
      label: 'Wierność protokołowi',
      description: 'AI nie dodaje informacji spoza protokołu.',
      missingPhrase: 'zakazu dodawania informacji spoza protokołu',
      tip: 'Dopisz: „Korzystaj tylko z treści protokołu”.',
      praise: 'Pilnujesz wierności źródłu.',
      demo: { groups: [['tylko', 'wylacznie', 'nie dodawaj', 'nie wymyslaj', 'zaznacz', 'brak', 'wiern']], full: 1 },
    },
  ],
  examplePrompt:
    'Streść poniższy protokół odbioru dla kierownika, który ma minutę na lekturę. Na początku decyzja komisji (1 zdanie), następnie tabela: usterka – termin usunięcia. Łącznie maks. 5 punktów. Korzystaj tylko z treści protokołu.',
  exampleWhy: ['Układ i długość są jednoznaczne.', 'Najważniejsza informacja (decyzja) jest na początku.'],
  verifyTip: 'Sprawdź, czy AI wymieniła wszystkie 3 usterki i termin 14 dni.',
  minWords: 10,
};

export const DRILL_WERYFIKACJA: PromptTask = {
  id: 'd-weryfikacja',
  level: 'sredni',
  kind: 'fix',
  focusSkill: 'weryfikacja',
  title: 'Ćwiczenie celowane: weryfikacja',
  short: 'Poproś AI o źródła i oznaczenie niepewności przy pytaniach o przepisy.',
  scenario:
    'Przygotowujesz odpowiedź dla odbiorcy pytającego o wymagania dotyczące temperatury w mieszkaniach. AI może podać nieaktualne lub zmyślone przepisy. Popraw polecenie, aby AI wskazała podstawy prawne do sprawdzenia i oznaczyła, czego nie jest pewna.',
  brokenPrompt: 'Podaj normy temperatury w mieszkaniach.',
  placeholder: 'Np. Przygotowuję odpowiedź dla odbiorcy… Wskaż…',
  simpleExplanation:
    'AI czasem „pewnym głosem” podaje przepisy, które nie istnieją lub są nieaktualne. Poproś ją o wskazanie konkretnych aktów prawnych do sprawdzenia i o oznaczenie informacji, których nie jest pewna.',
  hints: [
    'Napisz, po co ci ta informacja (odpowiedź dla odbiorcy).',
    'Poproś o nazwę aktu prawnego i przepisu, które sam sprawdzisz.',
    'Dodaj: „jeśli nie masz pewności lub przepis mógł się zmienić — napisz to wprost”.',
  ],
  criteria: [
    {
      id: 'weryfikacja',
      skill: 'weryfikacja',
      weight: 50,
      label: 'Źródła i niepewność',
      description: 'Prośba o podstawę prawną do sprawdzenia i oznaczenie niepewności.',
      missingPhrase: 'prośby o źródła i oznaczenie niepewności',
      tip: 'Dopisz: „Wskaż akt prawny i przepis do sprawdzenia. Zaznacz, czego nie jesteś pewna lub co mogło się zmienić”.',
      praise: 'Wymagasz źródeł i szczerości co do niepewności.',
      demo: {
        groups: [
          ['zrodl', 'podstaw prawn', 'akt prawn', 'przepis', 'rozporzadz', 'ustaw'],
          ['zaznacz', 'niepewn', 'sprawdz', 'zweryfik', 'nie jestes pewn', 'aktualn', 'nie wymyslaj', 'zmienil'],
        ],
        full: 2,
      },
    },
    {
      id: 'kontekst',
      skill: 'kontekst',
      weight: 25,
      label: 'Cel informacji',
      description: 'Wiadomo, do czego potrzebna jest informacja.',
      missingPhrase: 'celu, do którego potrzebujesz informacji',
      tip: 'Dopisz: „Przygotowuję odpowiedź na pytanie odbiorcy”.',
      praise: 'AI wie, do czego potrzebujesz informacji.',
      demo: { groups: [['odpowiedz', 'pismo', 'odbiorc', 'skarg', 'pytani', 'klient', 'zapytan']], full: 1 },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 25,
      label: 'Forma',
      description: 'Określona forma odpowiedzi.',
      missingPhrase: 'formy odpowiedzi',
      tip: 'Dodaj np. „krótko, w punktach”.',
      praise: 'Określasz formę.',
      demo: { groups: [['krotk', 'punkt', 'list', 'zdan', 'tabel', 'zwiezl']], full: 1 },
    },
  ],
  examplePrompt:
    'Przygotowuję odpowiedź na pytanie odbiorcy o wymagane temperatury w mieszkaniach. Wypisz w punktach, jakie przepisy mogą tego dotyczyć — podaj nazwę aktu prawnego i przepisu, abym mógł je sprawdzić u źródła. Jeśli nie masz pewności lub przepis mógł się zmienić, napisz to wprost. Nie podawaj wartości, których nie potrafisz powiązać z konkretnym przepisem.',
  exampleWhy: ['AI ma wskazać źródła do samodzielnego sprawdzenia.', 'Niepewność musi być ujawniona.'],
  verifyTip: 'Każdy przepis wskazany przez AI sprawdź w oficjalnym źródle (np. w serwisie z aktami prawnymi) przed użyciem w odpowiedzi.',
  minWords: 12,
};

export const DRILL_BEZPIECZENSTWO: PromptTask = {
  id: 'd-bezpieczenstwo',
  level: 'poczatkujacy',
  kind: 'fix',
  focusSkill: 'bezpieczenstwo',
  title: 'Ćwiczenie celowane: ochrona danych',
  short: 'Usuń dane osobowe z polecenia, zachowując jego sens.',
  scenario:
    'Polecenie poniżej zawiera dane osobowe odbiorcy. Przepisz je tak, aby AI mogła pomóc w napisaniu odpowiedzi na skargę dotyczącą rachunku za ciepło, ale bez ujawniania danych osobowych. Zastąp je opisami lub znacznikami, np. [ODBIORCA].',
  brokenPrompt:
    'Napisz odpowiedź do Jana Nowaka, tel. 600 100 200, ul. Polna 5/3, PESEL 80010112345, który skarży się, że rachunek za ciepło jest za wysoki.',
  placeholder: 'Np. Napisz odpowiedź do [ODBIORCA]…',
  simpleExplanation:
    'Do AI nie wklejamy imion, nazwisk, telefonów, adresów ani numerów PESEL. AI nie potrzebuje ich, żeby napisać dobrą odpowiedź — wystarczą znaczniki typu [ODBIORCA], które później zastąpisz prawdziwymi danymi.',
  hints: [
    'Usuń imię i nazwisko, telefon, adres i PESEL.',
    'Zastąp je znacznikiem, np. [ODBIORCA], [ADRES].',
    'Zostaw sens sprawy: skarga na wysoki rachunek za ciepło. Dodaj ton i formę odpowiedzi.',
  ],
  criteria: [
    {
      id: 'dane-osobowe',
      skill: 'bezpieczenstwo',
      weight: 50,
      label: 'Brak danych osobowych',
      description: 'Polecenie nie zawiera danych osobowych; użyto znaczników lub opisów.',
      missingPhrase: 'zastąpienia danych osobowych znacznikami',
      tip: 'Usuń imię, nazwisko, telefon, adres i PESEL. Użyj znaczników, np. [ODBIORCA].',
      praise: 'Dane osobowe są usunięte — tak trzymać!',
      demo: {
        groups: [['\\[', '<', 'odbiorc', 'klient', 'mieszkan', 'xxx', 'anonim', 'dane usuniet', 'znacznik']],
        full: 1,
        forbidden: ['nowak', '600\\s?100\\s?200', '80010112345', 'polna\\s*5', '\\b\\d{11}\\b', '\\b\\d{3}[\\s-]?\\d{3}[\\s-]?\\d{3}\\b'],
      },
    },
    {
      id: 'kontekst',
      skill: 'kontekst',
      weight: 25,
      label: 'Sens sprawy',
      description: 'Zachowany temat: skarga na wysokość rachunku za ciepło.',
      missingPhrase: 'tematu skargi',
      tip: 'Zostaw sens sprawy: „skarga na zbyt wysoki rachunek za ciepło”.',
      praise: 'Sens sprawy jest zachowany.',
      demo: {
        groups: [
          ['rachun', 'faktur', 'oplat', 'rozliczen', 'koszt'],
          ['skarg', 'reklamac', 'wyjasni', 'odpowiedz'],
        ],
        full: 2,
      },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 25,
      label: 'Ton i forma',
      description: 'Określony ton lub forma odpowiedzi.',
      missingPhrase: 'tonu lub formy odpowiedzi',
      tip: 'Dodaj np. „uprzejmy, rzeczowy list, maks. 8 zdań”.',
      praise: 'Określasz ton i formę.',
      demo: { groups: [['uprzejm', 'rzeczow', 'krotk', 'zdan', 'pismo', 'list', 'e-mail', 'mail', 'ton']], full: 1 },
    },
  ],
  examplePrompt:
    'Napisz uprzejmą, rzeczową odpowiedź do [ODBIORCA], który skarży się, że rachunek za ciepło jest za wysoki. Wyjaśnij ogólnie, z czego składa się rachunek (opłaty stałe i zmienne) i zaproponuj sprawdzenie odczytów licznika. Maks. 8 zdań. Dane odbiorcy uzupełnię samodzielnie.',
  exampleWhy: ['Brak danych osobowych — znacznik [ODBIORCA].', 'Sens sprawy, ton i forma są zachowane.'],
  verifyTip: 'Przed wysłaniem uzupełnij znaczniki prawdziwymi danymi już poza narzędziem AI.',
  minWords: 10,
};

export const DRILLS: PromptTask[] = [DRILL_CEL, DRILL_KONTEKST, DRILL_DANE, DRILL_FORMAT, DRILL_WERYFIKACJA, DRILL_BEZPIECZENSTWO];
