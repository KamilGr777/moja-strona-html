import type { IconName, LevelId } from './types';

/**
 * Biblioteka gotowych promptów zawodowych.
 * Pola {{klucz}} w szablonie użytkownik uzupełnia własnymi danymi (bez danych osobowych).
 */

export type LibraryCategory =
  | 'eksploatacja'
  | 'utrzymanie'
  | 'dokumentacja'
  | 'raportowanie'
  | 'analiza'
  | 'organizacja'
  | 'komunikacja'
  | 'inwestycje'
  | 'zarzadzanie';

export const LIBRARY_CATEGORIES: { id: LibraryCategory; label: string; icon: IconName }[] = [
  { id: 'eksploatacja', label: 'Eksploatacja', icon: 'flame' },
  { id: 'utrzymanie', label: 'Utrzymanie ruchu', icon: 'wrench' },
  { id: 'dokumentacja', label: 'Dokumentacja techniczna', icon: 'file' },
  { id: 'raportowanie', label: 'Raportowanie', icon: 'list' },
  { id: 'analiza', label: 'Analiza danych', icon: 'chart' },
  { id: 'organizacja', label: 'Organizacja pracy', icon: 'clock' },
  { id: 'komunikacja', label: 'Komunikacja z odbiorcami', icon: 'message' },
  { id: 'inwestycje', label: 'Planowanie i inwestycje', icon: 'route' },
  { id: 'zarzadzanie', label: 'Zarządzanie', icon: 'users' },
];

export interface LibraryField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export interface LibraryPrompt {
  id: string;
  category: LibraryCategory;
  title: string;
  description: string;
  level: LevelId;
  template: string;
  fields: LibraryField[];
  verifyTip: string;
}

export const LIBRARY: LibraryPrompt[] = [
  {
    id: 'lib-notatka-przeglad',
    category: 'eksploatacja',
    title: 'Notatka z przeglądu węzła cieplnego',
    description: 'Zamienia Twoje ustalenia z przeglądu w uporządkowaną notatkę służbową.',
    level: 'poczatkujacy',
    template:
      'Przygotuj notatkę służbową z przeglądu węzła cieplnego {{wezel}} wykonanego {{data}} dla {{odbiorca}}.\n\nUstalenia z przeglądu:\n{{ustalenia}}\n\nUkład notatki: 1) stan stwierdzony, 2) wykonane czynności, 3) zalecenia (oznaczone jako propozycje do decyzji), 4) sprawy do wyjaśnienia.\nKorzystaj wyłącznie z podanych ustaleń — nie dodawaj wartości ani zdarzeń, których nie ma powyżej. Styl rzeczowy, maks. 1 strona.',
    fields: [
      { key: 'wezel', label: 'Oznaczenie węzła', placeholder: 'np. W-27' },
      { key: 'data', label: 'Data przeglądu', placeholder: 'np. 18 listopada' },
      { key: 'odbiorca', label: 'Odbiorca notatki', placeholder: 'np. kierownika działu eksploatacji' },
      { key: 'ustalenia', label: 'Ustalenia (punktami)', placeholder: '– wymieniono manometr na powrocie…\n– filtr siatkowy zanieczyszczony…', multiline: true },
    ],
    verifyTip: 'Porównaj notatkę z ustaleniami: wartości, oznaczenia urządzeń i zalecenia. Usuń wszystko, czego nie stwierdzono.',
  },
  {
    id: 'lib-chronologia-awarii',
    category: 'eksploatacja',
    title: 'Chronologia awarii z notatek',
    description: 'Układa notatki z akcji awaryjnej w czytelną oś czasu z listą działań.',
    level: 'poczatkujacy',
    template:
      'Na podstawie poniższych notatek z akcji awaryjnej przygotuj:\n1) chronologię zdarzeń w tabeli: godzina – zdarzenie,\n2) listę działań do wykonania po awarii.\n\nKorzystaj wyłącznie z notatek. Informacje niepewne lub wstępne (np. przyczyna) oznacz jako [DO POTWIERDZENIA]. Nie podawaj przyczyn, których nie ma w notatkach.\n\nNOTATKI:\n{{notatki}}',
    fields: [{ key: 'notatki', label: 'Notatki z akcji (bez danych osobowych)', placeholder: '06:40 zgłoszenie…\n07:25 odcięcie odcinka…', multiline: true }],
    verifyTip: 'Sprawdź każdą godzinę i liczbę z notatkami. Upewnij się, że przyczyna nie została podana jako pewna, jeśli była wstępna.',
  },
  {
    id: 'lib-lista-kontrolna',
    category: 'utrzymanie',
    title: 'Lista kontrolna na podstawie procedury',
    description: 'Tworzy listę kontrolną z Twojej firmowej procedury — do odhaczania na miejscu.',
    level: 'poczatkujacy',
    template:
      'Na podstawie poniższej procedury przygotuj listę kontrolną dla prac: {{rodzaj_prac}}.\nUkład: kroki do odhaczenia (☐) w kolejności wykonywania, z wyróżnieniem wymagań BHP.\nNie dodawaj kroków, których nie ma w procedurze. Jeśli procedura jest w jakimś miejscu niejasna, wypisz to na końcu jako „do wyjaśnienia z przełożonym”.\n\nPROCEDURA:\n{{procedura}}',
    fields: [
      { key: 'rodzaj_prac', label: 'Rodzaj prac', placeholder: 'np. zejście do komory ciepłowniczej' },
      { key: 'procedura', label: 'Treść procedury (wklej)', placeholder: 'Wklej obowiązującą procedurę…', multiline: true },
    ],
    verifyTip: 'Listę porównaj z obowiązującą procedurą punkt po punkcie. Lista z AI nie zastępuje procedury ani instruktażu BHP.',
  },
  {
    id: 'lib-powtarzalne-usterki',
    category: 'utrzymanie',
    title: 'Analiza powtarzających się usterek',
    description: 'Grupuje zgłoszenia usterek i pokazuje, co się powtarza.',
    level: 'sredni',
    template:
      'Poniżej zgłoszenia usterek z okresu {{okres}} (bez danych osobowych). Pogrupuj je według: lokalizacja (węzeł/komora), typ usterki, liczba wystąpień.\nWynik: tabela lokalizacja – typ usterki – liczba – numery zgłoszeń. Następnie wskaż maks. 3 obserwacje dotyczące powtarzalności, każdą z odwołaniem do numerów zgłoszeń. Możliwe przyczyny podaj wyłącznie jako hipotezy do sprawdzenia.\n\nZGŁOSZENIA:\n{{zgloszenia}}',
    fields: [
      { key: 'okres', label: 'Okres', placeholder: 'np. I–III kwartał' },
      { key: 'zgloszenia', label: 'Zgłoszenia (numer, lokalizacja, opis)', placeholder: 'Z1 – W-31 – wyciek na dławicy pompy…', multiline: true },
    ],
    verifyTip: 'Sprawdź liczby w tabeli — policz ręcznie wystąpienia dla 2–3 lokalizacji.',
  },
  {
    id: 'lib-streszczenie-dokumentu',
    category: 'dokumentacja',
    title: 'Streszczenie instrukcji lub dokumentu dla zespołu',
    description: 'Skraca długi dokument do najważniejszych informacji dla konkretnej grupy.',
    level: 'poczatkujacy',
    template:
      'Streść poniższy dokument dla: {{odbiorcy}}.\nSkup się na: {{zakres}}.\nForma: punkty, maks. 1 strona. Ostrzeżenia i wymagania bezpieczeństwa wypisz osobno na początku. Przy każdym punkcie podaj numer rozdziału lub strony dokumentu, z którego pochodzi.\n\nDOKUMENT:\n{{dokument}}',
    fields: [
      { key: 'odbiorcy', label: 'Dla kogo', placeholder: 'np. monterów obsługujących węzły' },
      { key: 'zakres', label: 'Na czym się skupić', placeholder: 'np. uruchomienie, zatrzymanie, typowe usterki' },
      { key: 'dokument', label: 'Treść dokumentu (wklej)', placeholder: 'Wklej tekst dokumentu…', multiline: true },
    ],
    verifyTip: 'Odwołania do rozdziałów pozwalają szybko sprawdzić najważniejsze punkty w oryginale.',
  },
  {
    id: 'lib-protokol',
    category: 'dokumentacja',
    title: 'Uporządkowanie protokołu odbioru',
    description: 'Wyciąga z protokołu decyzję, usterki i terminy.',
    level: 'sredni',
    template:
      'Z poniższego protokołu odbioru technicznego przygotuj:\n1) decyzję komisji w 1 zdaniu,\n2) tabelę: usterka – termin usunięcia – odpowiedzialny (jeśli wskazano; jeśli nie — wpisz „nie wskazano”),\n3) listę dokumentów do uzupełnienia.\nKorzystaj tylko z treści protokołu.\n\nPROTOKÓŁ:\n{{protokol}}',
    fields: [{ key: 'protokol', label: 'Treść protokołu (wklej)', placeholder: 'Wklej protokół…', multiline: true }],
    verifyTip: 'Sprawdź decyzję komisji i terminy — to najczęstsze miejsca pomyłek.',
  },
  {
    id: 'lib-raport-miesieczny',
    category: 'raportowanie',
    title: 'Raport miesięczny z prac',
    description: 'Szkic raportu z prac eksploatacyjnych ze stałą strukturą.',
    level: 'sredni',
    template:
      'Jesteś specjalistą ds. eksploatacji sieci ciepłowniczej. Przygotuj szkic raportu z prac za {{miesiac}} dla {{odbiorca}}.\nKorzystaj wyłącznie z poniższych danych — nie dodawaj własnych liczb. Braki oznacz [BRAK DANYCH].\nSekcje: 1) podsumowanie (3 zdania), 2) tabela plan – wykonanie – uwagi, 3) problemy i ryzyka, 4) propozycje na kolejny miesiąc (do decyzji).\nStyl rzeczowy, maks. 1 strona.\n\nDANE:\n{{dane}}',
    fields: [
      { key: 'miesiac', label: 'Miesiąc', placeholder: 'np. listopad' },
      { key: 'odbiorca', label: 'Odbiorca', placeholder: 'np. kierownika działu eksploatacji' },
      { key: 'dane', label: 'Zestawienie prac', placeholder: 'Przeglądy komór: 14 (plan 16)…', multiline: true },
    ],
    verifyTip: 'Porównaj każdą liczbę w tabeli z zestawieniem. Sprawdź sumy.',
  },
  {
    id: 'lib-dane-pomiarowe',
    category: 'analiza',
    title: 'Opis danych pomiarowych z obliczeniami',
    description: 'Rzetelny opis tabeli pomiarów z pokazaniem obliczeń i hipotezami.',
    level: 'sredni',
    template:
      'Poniżej tabela: {{opis_danych}}.\nOpierając się wyłącznie na tych danych, odpowiedz na pytania:\n{{pytania}}\n\nPokaż obliczenia dla wartości średnich i różnic. Kluczowe wartości zestaw w tabeli. Możliwe przyczyny nietypowych wartości podaj tylko jako hipotezy do sprawdzenia.\n\nDANE:\n{{tabela}}',
    fields: [
      { key: 'opis_danych', label: 'Co zawiera tabela', placeholder: 'np. godzinowe temperatury zasilania i powrotu [°C] z jednej doby' },
      { key: 'pytania', label: 'Pytania (mierzalne)', placeholder: '1) wartość maksymalna i godzina…\n2) średnia różnica temperatur…', multiline: true },
      { key: 'tabela', label: 'Tabela danych (wklej)', placeholder: 'Godzina;Zasilanie;Powrót…', multiline: true },
    ],
    verifyTip: 'Sprawdź 2–3 wartości samodzielnie (np. w arkuszu). Przyczyny traktuj jako hipotezy.',
  },
  {
    id: 'lib-porownanie-wariantow',
    category: 'analiza',
    title: 'Porównanie wariantów technicznych',
    description: 'Tabela porównawcza wariantów z jawnymi założeniami.',
    level: 'sredni',
    template:
      'Przygotuj porównanie wariantów do decyzji: {{decyzja}}.\n\nWarianty:\n{{warianty}}\n\nPorównaj w tabeli według kryteriów: {{kryteria}}. Oznacz założenia, które przyjmujesz (np. ceny, czas pracy). Na końcu podaj rekomendację jako propozycję do decyzji, z uzasadnieniem w 2 zdaniach. Nie dodawaj danych, których nie podałem — jeśli są potrzebne, wypisz je jako brakujące.',
    fields: [
      { key: 'decyzja', label: 'Czego dotyczy decyzja', placeholder: 'np. naprawa czy wymiana pompy w węźle W-22' },
      { key: 'warianty', label: 'Warianty z danymi', placeholder: 'A: … koszt, czas…\nB: …', multiline: true },
      { key: 'kryteria', label: 'Kryteria porównania', placeholder: 'np. koszt, czas, ryzyko, koszty energii' },
    ],
    verifyTip: 'Sprawdź, czy wszystkie liczby w tabeli pochodzą z Twoich danych, a założenia są wyraźnie oznaczone.',
  },
  {
    id: 'lib-plan-tygodnia',
    category: 'organizacja',
    title: 'Plan tygodnia z listy zadań',
    description: 'Układa zadania w realny plan z priorytetami.',
    level: 'poczatkujacy',
    template:
      'Pomóż mi zaplanować tydzień. Oto lista zadań (z szacowanym czasem, jeśli go znam):\n{{zadania}}\n\nOgraniczenia: {{ograniczenia}}.\nUłóż plan na dni robocze w tabeli: dzień – zadania – szacowany czas. Zadania pilne i związane z bezpieczeństwem umieść najwcześniej. Jeśli zadań jest więcej niż czasu, wskaż, co proponujesz przesunąć.',
    fields: [
      { key: 'zadania', label: 'Lista zadań', placeholder: '– raport miesięczny (3 h)\n– przegląd W-27 (2 h)…', multiline: true },
      { key: 'ograniczenia', label: 'Ograniczenia', placeholder: 'np. środa – szkolenie BHP do 12:00, dyżur w piątek' },
    ],
    verifyTip: 'Sprawdź, czy plan uwzględnia wszystkie zadania i Twoje ograniczenia.',
  },
  {
    id: 'lib-notatka-spotkanie',
    category: 'organizacja',
    title: 'Notatka ze spotkania z ustaleniami',
    description: 'Porządkuje notatki ze spotkania w ustalenia i zadania.',
    level: 'poczatkujacy',
    template:
      'Uporządkuj poniższe notatki ze spotkania. Uczestnicy (role, bez nazwisk): {{uczestnicy}}.\nWynik: 1) ustalenia (punkty), 2) tabela zadań: zadanie – odpowiedzialna rola – termin (jeśli nie ustalono, wpisz „do ustalenia”), 3) sprawy otwarte.\nNie dodawaj ustaleń, których nie ma w notatkach.\n\nNOTATKI:\n{{notatki}}',
    fields: [
      { key: 'uczestnicy', label: 'Uczestnicy (role)', placeholder: 'np. kierownik eksploatacji, dyspozytor, przedstawiciel wykonawcy' },
      { key: 'notatki', label: 'Notatki', placeholder: 'Wklej swoje notatki…', multiline: true },
    ],
    verifyTip: 'Upewnij się, że terminy i odpowiedzialni zgadzają się z tym, co ustalono.',
  },
  {
    id: 'lib-komunikat-przerwa',
    category: 'komunikacja',
    title: 'Komunikat o przerwie w dostawie ciepła',
    description: 'Gotowy szablon komunikatu dla zarządcy i mieszkańców.',
    level: 'poczatkujacy',
    template:
      'Napisz komunikat o planowanej przerwie w dostawie ciepła dla zarządcy nieruchomości, który przekaże go mieszkańcom.\nTermin: {{termin}}\nBudynki: {{adresy}}\nPowód: {{powod}}\nZakres: {{zakres}}\nKontakt: {{kontakt}}\n\nForma: e-mail z tematem, maks. 6 zdań. Ton uprzejmy i rzeczowy, bez żargonu. Na końcu poproś o wywieszenie informacji na klatkach schodowych.',
    fields: [
      { key: 'termin', label: 'Termin', placeholder: 'np. wtorek 24 listopada, 8:00–14:00' },
      { key: 'adresy', label: 'Budynki', placeholder: 'np. ul. Słoneczna 2, 4, 6, 8' },
      { key: 'powod', label: 'Powód', placeholder: 'np. wymiana zaworu odcinającego' },
      { key: 'zakres', label: 'Zakres', placeholder: 'np. ogrzewanie i ciepła woda użytkowa' },
      { key: 'kontakt', label: 'Kontakt', placeholder: 'np. Pogotowie ciepłownicze, tel. 993' },
    ],
    verifyTip: 'Przed wysłaniem porównaj datę, godziny, adresy i numer telefonu z danymi.',
  },
  {
    id: 'lib-odpowiedz-skarga',
    category: 'komunikacja',
    title: 'Odpowiedź na skargę odbiorcy',
    description: 'Uprzejma, rzeczowa odpowiedź oparta na ustaleniach — bez danych osobowych.',
    level: 'poczatkujacy',
    template:
      'Napisz odpowiedź do [ODBIORCA] na skargę dotyczącą: {{skarga}}.\nNasze ustalenia: {{ustalenia}}.\nTon: {{ton}}. Forma: list/e-mail, maks. 8 zdań. Nie obiecuj działań ani terminów, których nie podałem. Dane odbiorcy uzupełnię samodzielnie.',
    fields: [
      { key: 'skarga', label: 'Czego dotyczy skarga', placeholder: 'np. zbyt niska temperatura w mieszkaniu' },
      { key: 'ustalenia', label: 'Co ustaliliście', placeholder: 'np. parametry w węźle prawidłowe; problem w instalacji wewnętrznej (zarządca)', multiline: true },
      { key: 'ton', label: 'Ton', placeholder: 'np. uprzejmy, ze zrozumieniem, rzeczowy' },
    ],
    verifyTip: 'Sprawdź, czy odpowiedź nie zawiera obietnic ani informacji, których nie podałeś. Znacznik [ODBIORCA] uzupełnij poza narzędziem AI.',
  },
  {
    id: 'lib-wniosek-inwestycyjny',
    category: 'inwestycje',
    title: 'Uzasadnienie wniosku inwestycyjnego',
    description: 'Struktura uzasadnienia: problem, dane, warianty, ryzyka.',
    level: 'zaawansowany',
    template:
      'Przygotuj szkic uzasadnienia wniosku inwestycyjnego: {{przedsiewziecie}} dla {{odbiorca}}.\nProblem: {{problem}}\nDane, którymi dysponuję:\n{{dane}}\n\nStruktura: 1) problem i jego skutki, 2) dane potwierdzające (tylko z powyższych), 3) rozważane warianty, 4) ryzyka zaniechania, 5) informacje brakujące do decyzji. Nie szacuj kosztów ani oszczędności, których nie podałem — wypisz je jako brakujące.',
    fields: [
      { key: 'przedsiewziecie', label: 'Przedsięwzięcie', placeholder: 'np. wymiana odcinka sieci DN150 przy ul. Kwiatowej' },
      { key: 'odbiorca', label: 'Odbiorca', placeholder: 'np. komisji inwestycyjnej' },
      { key: 'problem', label: 'Problem', placeholder: 'np. powtarzające się wycieki, wiek odcinka ponad 40 lat' },
      { key: 'dane', label: 'Dane', placeholder: '– 3 awarie w 2 lata…\n– straty…', multiline: true },
    ],
    verifyTip: 'Każda liczba w uzasadnieniu musi pochodzić z Twoich danych. Sekcja „informacje brakujące” to Twoja lista do uzupełnienia.',
  },
  {
    id: 'lib-zmiana-zespol',
    category: 'zarzadzanie',
    title: 'Przygotowanie rozmowy z zespołem o zmianie',
    description: 'Pomaga zaplanować rozmowę: komunikaty, pytania i obawy zespołu.',
    level: 'sredni',
    template:
      'Pomóż mi przygotować rozmowę z zespołem o zmianie: {{zmiana}}.\nPowody zmiany: {{powody}}.\nObawy, których się spodziewam: {{obawy}}.\nPrzygotuj: 1) 3 kluczowe komunikaty prostym językiem, 2) prawdopodobne pytania zespołu z propozycjami odpowiedzi, 3) czego nie obiecywać, jeśli nie mam pewności. Nie wymyślaj szczegółów zmiany, których nie podałem.',
    fields: [
      { key: 'zmiana', label: 'Na czym polega zmiana', placeholder: 'np. nowy system zgłaszania usterek od stycznia' },
      { key: 'powody', label: 'Powody', placeholder: 'np. szybsza obsługa zgłoszeń, mniej papieru' },
      { key: 'obawy', label: 'Spodziewane obawy', placeholder: 'np. więcej pracy przy wprowadzaniu danych' },
    ],
    verifyTip: 'Odpowiedzi na pytania zespołu sprawdź z faktami — nie obiecuj tego, czego nie wiesz.',
  },
  {
    id: 'lib-zarzad-strona',
    category: 'zarzadzanie',
    title: 'Podsumowanie dla zarządu na jedną stronę',
    description: 'Skraca materiały do jednostronicowej informacji zarządczej.',
    level: 'zaawansowany',
    template:
      'Przygotuj jednostronicowe podsumowanie dla zarządu na temat: {{temat}}.\nUkład: 1) najważniejsza informacja w 2 zdaniach, 2) kluczowe liczby (tabela, tylko z materiałów), 3) ryzyka, 4) decyzje, o które prosimy, 5) brakujące informacje.\nKorzystaj wyłącznie z poniższych materiałów. Przy każdej liczbie wskaż, z którego materiału pochodzi.\n\nMATERIAŁY:\n{{materialy}}',
    fields: [
      { key: 'temat', label: 'Temat', placeholder: 'np. przygotowanie sieci do sezonu grzewczego' },
      { key: 'materialy', label: 'Materiały (wklej, bez danych poufnych)', placeholder: 'Wklej raporty, zestawienia…', multiline: true },
    ],
    verifyTip: 'Sprawdź każdą liczbę ze wskazanym materiałem źródłowym, zanim dokument trafi do zarządu.',
  },
];

/** Wypełnia szablon wartościami pól. Puste pola zostają jako [ETYKIETA] — widać, czego brakuje. */
export function fillTemplate(prompt: LibraryPrompt, values: Record<string, string>): string {
  return prompt.template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = values[key]?.trim();
    if (v) return v;
    const field = prompt.fields.find((f) => f.key === key);
    return `[${(field?.label ?? key).toUpperCase()}]`;
  });
}
