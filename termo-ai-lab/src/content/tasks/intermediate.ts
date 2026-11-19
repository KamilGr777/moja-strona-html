import type { PromptTask } from '../types';
import { NOTATKA_OBCHOD, PRACE_MIESIAC } from '../materials';
import { formatPl, hourLabel, tempStats, tempTableText } from '../chartData';

const stats = tempStats();

export const TASK_RAPORT: PromptTask = {
  id: 't-raport-miesieczny',
  level: 'sredni',
  kind: 'write',
  title: 'Miesięczny raport z prac eksploatacyjnych',
  short: 'Zbuduj rozbudowany prompt: rola, kontekst, dane, struktura i ograniczenia.',
  scenario:
    'Co miesiąc przygotowujesz dla kierownika działu raport z prac eksploatacyjnych. Napisz rozbudowany prompt, dzięki któremu AI przygotuje szkic raportu za październik na podstawie zestawienia poniżej. Zadbaj o rolę, kontekst, strukturę raportu, ograniczenia i możliwość sprawdzenia wyniku.',
  materials: [{ title: PRACE_MIESIAC.title, content: PRACE_MIESIAC.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Jesteś… Przygotuj… Raport ma zawierać sekcje…',
  simpleExplanation:
    'Masz napisać dłuższe polecenie, które AI wykona jak doświadczony współpracownik. Powiedz jej, kim ma być (np. specjalistą ds. eksploatacji), dla kogo jest raport, z jakich danych korzysta, jakie sekcje ma mieć raport i jak długi ma być.',
  hints: [
    'Zacznij od roli: „Jesteś specjalistą ds. eksploatacji sieci ciepłowniczej i przygotowujesz raport miesięczny”.',
    'Wskaż odbiorcę i okres: raport dla kierownika działu, za październik.',
    'Rozpisz strukturę: np. 1) podsumowanie w 3 zdaniach, 2) tabela liczbowa, 3) problemy, 4) plan na kolejny miesiąc.',
    'Dodaj ograniczenia (długość, ton) i poproś o zaznaczenie miejsc, gdzie brakuje danych.',
  ],
  criteria: [
    {
      id: 'rola',
      skill: 'struktura',
      weight: 15,
      label: 'Rola i cel',
      description: 'AI otrzymuje rolę i wie, że ma przygotować raport.',
      missingPhrase: 'swojej roli',
      tip: 'Dodaj rolę na początku: „Jesteś specjalistą ds. eksploatacji…”.',
      praise: 'Nadajesz AI rolę — odpowiedź będzie bardziej fachowa.',
      demo: {
        groups: [
          ['jestes', 'wciel', 'dzialaj jako', 'jako specjalist', 'jako inzynier', 'jako asystent', 'rola', 'role', 'wystepuj jako'],
          ['raport', 'zestawien', 'sprawozdan', 'podsumowan'],
        ],
        full: 2,
      },
    },
    {
      id: 'kontekst',
      skill: 'kontekst',
      weight: 15,
      label: 'Odbiorca i okres',
      description: 'Wiadomo, dla kogo jest raport i jakiego okresu dotyczy.',
      missingPhrase: 'odbiorcy raportu i okresu, którego dotyczy',
      tip: 'Dopisz: „raport dla kierownika działu eksploatacji, za październik”.',
      praise: 'Wskazujesz odbiorcę i okres raportu.',
      demo: {
        groups: [
          ['kierownik', 'przelozon', 'zarzad', 'dyrektor', 'dzial', 'szef'],
          ['miesi', 'okres', 'pazdziernik', 'kwarta', '\\d{4}'],
        ],
        full: 2,
      },
    },
    {
      id: 'dane',
      skill: 'dane',
      weight: 20,
      label: 'Dane źródłowe',
      description: 'AI pracuje na dołączonym zestawieniu i nie dodaje własnych liczb.',
      missingPhrase: 'tego, że ma korzystać tylko z dołączonych danych',
      tip: 'Dopisz: „Korzystaj wyłącznie z poniższego zestawienia, nie dodawaj własnych liczb”.',
      praise: 'Ograniczasz AI do danych źródłowych.',
      demo: {
        groups: [
          ['ponizsz', 'zalaczon', 'dane', 'zestawien', 'lista prac', 'wykaz', 'na podstawie'],
          ['nie dodawaj', 'nie wymyslaj', 'tylko', 'wylacznie', 'brakuj', 'zaznacz', 'nie zmieniaj'],
        ],
        full: 2,
      },
    },
    {
      id: 'struktura',
      skill: 'format',
      weight: 25,
      label: 'Struktura raportu',
      description: 'Określone sekcje: podsumowanie, liczby (tabela), problemy, plan.',
      missingPhrase: 'struktury raportu',
      tip: 'Rozpisz sekcje: podsumowanie, tabela z liczbami, problemy i ryzyka, plan na kolejny miesiąc.',
      praise: 'Raport ma jasną strukturę — łatwo go przeczytać i sprawdzić.',
      demo: {
        groups: [
          ['sekcj', 'rozdzial', 'czesc', 'naglow', 'punkt', '1\\)', '1\\.'],
          ['podsumowan', 'wnios', 'rekomend', 'problem', 'plan', 'nastepn', 'ryzyk'],
          ['tabel', 'liczb', 'statystyk', 'ilosc', 'wskaznik'],
        ],
        full: 3,
      },
    },
    {
      id: 'ograniczenia',
      skill: 'ograniczenia',
      weight: 15,
      label: 'Długość i styl',
      description: 'Określona długość i styl (rzeczowy, bez żargonu, profesjonalny).',
      missingPhrase: 'oczekiwanej długości i stylu',
      tip: 'Dodaj np. „maksymalnie jedna strona, styl rzeczowy”.',
      praise: 'Określasz długość i styl raportu.',
      demo: {
        groups: [
          ['strona', 'stron', 'slow', 'zdan', 'krotk', 'zwiezl', 'maksymaln', 'dlugos'],
          ['rzeczow', 'profesjonaln', 'formaln', 'ton', 'styl', 'zargon', 'jezyk', 'prost'],
        ],
        full: 2,
      },
    },
    {
      id: 'weryfikacja',
      skill: 'weryfikacja',
      weight: 10,
      label: 'Możliwość sprawdzenia',
      description: 'AI ma oznaczyć braki, niepewności lub miejsca do weryfikacji.',
      missingPhrase: 'prośby o oznaczenie braków i niepewności',
      tip: 'Dopisz: „Oznacz miejsca, w których brakuje danych lub wnioski wymagają sprawdzenia”.',
      praise: 'Raport będzie łatwy do sprawdzenia — AI oznaczy niepewności.',
      demo: {
        groups: [['oznacz', 'zaznacz', 'niepewn', 'do weryfikacji', 'sprawdz', 'brakuj', 'brak danych', 'zrodl', 'potwierdz']],
        full: 1,
      },
    },
  ],
  examplePrompt:
    'Jesteś specjalistą ds. eksploatacji sieci ciepłowniczej. Przygotuj szkic miesięcznego raportu z prac eksploatacyjnych za październik dla kierownika działu eksploatacji.\n\nKorzystaj wyłącznie z poniższego zestawienia — nie dodawaj własnych liczb ani zdarzeń.\n\nStruktura:\n1) Podsumowanie (maks. 3 zdania).\n2) Tabela: rodzaj prac – plan – wykonanie – uwagi.\n3) Problemy i ryzyka (punkty).\n4) Propozycje działań na listopad — oznacz je jako propozycje do decyzji kierownika.\n\nStyl rzeczowy, maksymalnie jedna strona. Oznacz miejsca, w których brakuje danych lub wniosek wymaga sprawdzenia.\n\n[zestawienie prac]',
  exampleWhy: [
    'Rola, odbiorca i okres są jasne od pierwszego zdania.',
    'AI ma zakaz dodawania własnych liczb.',
    'Struktura raportu jest rozpisana — wynik łatwo porównać z danymi.',
    'Propozycje są oznaczone jako „do decyzji” — odpowiedzialność zostaje po stronie człowieka.',
  ],
  verifyTip:
    'Porównaj liczby w tabeli z zestawieniem (np. 14 przeglądów z 16 planowanych, 21 zgłoszeń). AI łatwo myli sumy.',
  minWords: 25,
};

export const TASK_WYKRES: PromptTask = {
  id: 't-analiza-wykresu',
  level: 'sredni',
  kind: 'data',
  title: 'Analiza dobowego przebiegu temperatur',
  short: 'Napisz prompt, który pozwoli AI rzetelnie opisać dane z wykresu.',
  scenario:
    'Masz dobowe dane temperatur zasilania i powrotu z magistrali M-2. Napisz prompt, dzięki któremu AI poprawnie opisze dane: poda najważniejsze wartości, wskaże nietypowy fragment i nie wyciągnie pochopnych wniosków. Do analizy dołącz tabelę danych (model językowy pracuje na liczbach z tabeli — nie „widzi” wykresu z tej aplikacji).',
  materials: [{ title: 'Tabela danych (do wklejenia do AI)', content: tempTableText(), copyable: true, attachToRun: true }],
  placeholder: 'Np. Poniżej wklejam tabelę z… Na jej podstawie podaj…',
  simpleExplanation:
    'AI policzy i opisze dane, ale musi wiedzieć, co oznaczają kolumny i co ma znaleźć. Twoje polecenie powinno: opisać dane, zadać konkretne pytania (np. wartość maksymalna, średnia różnica temperatur), poprosić o pokazanie obliczeń i ostrzec przed zgadywaniem przyczyn.',
  hints: [
    'Opisz dane: co to za pomiary, jakie jednostki, co godzinę przez dobę.',
    'Zadaj konkretne pytania: najwyższa i najniższa temperatura, różnica zasilanie–powrót (ΔT), średnia ΔT, nietypowe godziny.',
    'Poproś o pokazanie, jak policzono średnią — łatwiej wtedy sprawdzić wynik.',
    'Dodaj: „możliwe przyczyny podaj jako hipotezy do sprawdzenia, nie jako fakty”.',
  ],
  criteria: [
    {
      id: 'opis-danych',
      skill: 'dane',
      weight: 25,
      label: 'Opis danych',
      description: 'Polecenie opisuje dane: temperatury zasilania i powrotu, jednostki, pomiary godzinowe.',
      missingPhrase: 'znaczenia danych (jakie pomiary, jednostki, okres)',
      tip: 'Dopisz: „Tabela zawiera godzinowe pomiary temperatury zasilania i powrotu [°C] z jednej doby”.',
      praise: 'Opisujesz dane — AI wie, co oznaczają kolumny.',
      demo: {
        groups: [
          ['tabel', 'dane', 'ponizsz', 'zalaczon', 'csv', 'pomiar'],
          ['zasilan', 'powrot'],
          ['godzin', 'dob', 'co godzin', '24'],
        ],
        full: 3,
      },
    },
    {
      id: 'pytania',
      skill: 'cel',
      weight: 25,
      label: 'Konkretne pytania',
      description: 'Polecenie prosi o konkretne wartości: maksimum, minimum, średnią, różnicę temperatur, anomalie.',
      missingPhrase: 'konkretnych wartości, które ma wyznaczyć',
      tip: 'Wypisz pytania: maksymalna temperatura zasilania, najmniejsza ΔT (z godziną), średnia ΔT, nietypowe godziny.',
      praise: 'Zadajesz konkretne pytania — wynik będzie mierzalny.',
      demo: {
        groups: [
          ['maksym', 'najwyzsz', 'szczyt'],
          ['minim', 'najnizsz', 'najmniejsz'],
          ['sredni'],
          ['roznic', 'delta', 'δt', '\\bdt\\b'],
          ['anomal', 'odchyl', 'nietypow', 'nieprawidlow', 'skok', 'wzrost', 'zmian'],
        ],
        full: 3,
      },
    },
    {
      id: 'obliczenia',
      skill: 'weryfikacja',
      weight: 15,
      label: 'Pokazanie obliczeń',
      description: 'AI ma pokazać, jak wyznaczyła wartości (np. średnią).',
      missingPhrase: 'prośby o pokazanie obliczeń',
      tip: 'Dodaj: „Pokaż, jak obliczyłeś średnią różnicę temperatur”.',
      praise: 'Prosisz o pokazanie obliczeń — łatwo je sprawdzisz.',
      demo: {
        groups: [['pokaz', 'krok po kroku', 'wzor', 'sposob oblicz', 'jak oblicz', 'metod', 'rozpisz', 'wyjasnij oblicz']],
        full: 1,
      },
    },
    {
      id: 'ostroznosc',
      skill: 'weryfikacja',
      weight: 20,
      label: 'Bez pochopnych wniosków',
      description: 'AI ma opierać się tylko na danych, a przyczyny podawać jako hipotezy.',
      missingPhrase: 'tego, że przyczyny ma podawać tylko jako hipotezy',
      tip: 'Dopisz: „Opieraj się tylko na danych. Możliwe przyczyny podaj jako hipotezy do sprawdzenia”.',
      praise: 'Chronisz się przed pochopnymi wnioskami.',
      demo: {
        groups: [
          ['tylko na podstawie', 'wylacznie', 'tylko dane', 'nie wymyslaj', 'nie zgaduj', 'nie spekul', 'opieraj sie'],
          ['hipotez', 'mozliw', 'przypuszcz', 'zaznacz', 'oznacz', 'niepewn', 'do weryfikacji', 'potwierdz', 'sprawdzenia'],
        ],
        full: 2,
      },
    },
    {
      id: 'forma',
      skill: 'format',
      weight: 15,
      label: 'Forma odpowiedzi',
      description: 'Określona forma: tabela wartości, punkty, krótkie podsumowanie.',
      missingPhrase: 'formy odpowiedzi',
      tip: 'Dodaj np. „Odpowiedz w punktach, a kluczowe wartości zestaw w tabeli”.',
      praise: 'Określasz formę — wynik będzie czytelny.',
      demo: {
        groups: [['tabel', 'punkt', 'list', 'zestawien', 'sekcj', 'krotk', 'zdan', 'podsumow']],
        full: 1,
      },
    },
  ],
  examplePrompt:
    'Poniżej wklejam tabelę z godzinowymi pomiarami temperatury zasilania i powrotu [°C] z jednej doby (magistrala M-2). Opierając się wyłącznie na tych danych:\n1) podaj najwyższą i najniższą temperaturę zasilania (z godzinami),\n2) wyznacz różnicę temperatur zasilanie–powrót (ΔT) dla każdej godziny, podaj najmniejszą ΔT z godziną oraz średnią ΔT z doby — pokaż, jak ją obliczyłeś,\n3) wskaż godziny, w których przebieg odbiega od reszty doby.\n\nKluczowe wartości zestaw w tabeli. Możliwe przyczyny nietypowego przebiegu podaj wyłącznie jako hipotezy do sprawdzenia, nie jako fakty.\n\n[tabela danych]',
  exampleWhy: [
    'Dane są opisane: co mierzono, w jakich jednostkach i jak często.',
    'Pytania są konkretne i mierzalne — można je porównać z tabelą.',
    'AI ma pokazać obliczenia, więc błąd w średniej łatwo wychwycić.',
    'Przyczyny mają być hipotezami — dane same nie wskazują winnego.',
  ],
  verifyTip: `Wartości referencyjne z tabeli: maks. zasilanie ${stats.maxSupply} °C (${stats.maxSupplyHours.map(hourLabel).join(' i ')}), najmniejsza ΔT ${stats.minDelta} K (${stats.minDeltaHours.map(hourLabel).join(', ')}), średnia ΔT ok. ${formatPl(stats.avgDelta)} K. Porównaj je z odpowiedzią AI.`,
  referenceFacts: [
    { label: 'Najwyższa temperatura zasilania', value: String(stats.maxSupply), unit: '°C' },
    { label: 'Najniższa temperatura zasilania', value: String(stats.minSupply), unit: '°C' },
    { label: 'Najwyższa temperatura powrotu', value: String(stats.maxRet), unit: '°C' },
    { label: `Najmniejsza ΔT (${stats.minDeltaHours.map(hourLabel).join(', ')})`, value: String(stats.minDelta), unit: 'K' },
    {
      label: 'Średnia ΔT z doby',
      value: formatPl(stats.avgDelta),
      unit: 'K',
      alternatives: [String(stats.avgDelta), String(Math.round(stats.avgDelta * 100) / 100).replace('.', ','), '37,46', '37.46'],
    },
  ],
  minWords: 20,
};

export const TASK_NOTATKA: PromptTask = {
  id: 't-notatka-porzadkowanie',
  level: 'sredni',
  kind: 'document',
  title: 'Uporządkuj chaotyczną notatkę z obchodu',
  short: 'Napisz prompt, który zamieni roboczy zapis w czytelne podsumowanie dla zespołu.',
  scenario:
    'Po obchodzie sieci masz roboczą, chaotyczną notatkę. Napisz prompt, dzięki któremu AI zamieni ją w czytelne podsumowanie dla kierownika zmiany: z podziałem na sprawy pilne i pozostałe, bez dodawania informacji, których w notatce nie ma, i z wyraźnym oznaczeniem rzeczy niejasnych.',
  materials: [{ title: NOTATKA_OBCHOD.title, content: NOTATKA_OBCHOD.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Uporządkuj poniższą notatkę z obchodu…',
  simpleExplanation:
    'AI świetnie porządkuje bałagan, ale musi wiedzieć, jaki układ chcesz dostać i że nie wolno jej niczego dopisywać. Napisz: co ma powstać, dla kogo, w jakim układzie (np. pilne / pozostałe, lokalizacja, działanie) i że niejasności ma oznaczyć.',
  hints: [
    'Napisz, co ma powstać: czytelne podsumowanie obchodu dla kierownika zmiany.',
    'Zaproponuj układ: np. tabela z kolumnami „lokalizacja – problem – proponowane działanie – pilność”.',
    'Poproś o podział na sprawy pilne (np. BHP) i pozostałe.',
    'Dodaj zasadę wierności: nie dodawaj informacji spoza notatki, a niejasne sprawy oznacz jako „do wyjaśnienia”.',
  ],
  criteria: [
    {
      id: 'cel',
      skill: 'cel',
      weight: 15,
      label: 'Cel',
      description: 'Wiadomo, że notatka ma zostać uporządkowana w czytelne podsumowanie.',
      missingPhrase: 'tego, co ma powstać z notatki',
      tip: 'Zacznij od: „Uporządkuj poniższą notatkę z obchodu w czytelne podsumowanie”.',
      praise: 'Cel jest jasny.',
      demo: { groups: [['uporzadk', 'podsumow', 'zestawien', 'raport', 'przeredag', 'czyteln', 'zredaguj', 'przepisz']], full: 1 },
    },
    {
      id: 'struktura',
      skill: 'format',
      weight: 25,
      label: 'Układ wyniku',
      description: 'Określony układ: sekcje lub tabela, podział według pilności, wskazanie działań.',
      missingPhrase: 'oczekiwanego układu podsumowania',
      tip: 'Zaproponuj tabelę: lokalizacja – problem – działanie – pilność, z podziałem na sprawy pilne i pozostałe.',
      praise: 'Proponujesz konkretny układ — wynik będzie przejrzysty.',
      demo: {
        groups: [
          ['sekcj', 'naglow', 'punkt', 'list', 'tabel', 'kolumn'],
          ['priorytet', 'pilne', 'pilnosc', 'kolejnosc', 'bhp', 'waznosc'],
          ['dzialan', 'co zrobic', 'odpowiedzial', 'kto', 'lokalizac', 'miejsc'],
        ],
        full: 2,
      },
    },
    {
      id: 'wiernosc',
      skill: 'weryfikacja',
      weight: 25,
      label: 'Wierność notatce',
      description: 'AI nie dodaje informacji spoza notatki i oznacza sprawy niejasne.',
      missingPhrase: 'zakazu dopisywania informacji i prośby o oznaczanie niejasności',
      tip: 'Dopisz: „Nie dodawaj informacji, których nie ma w notatce. Niejasne sprawy oznacz jako »do wyjaśnienia«”.',
      praise: 'Pilnujesz wierności źródłu — świetnie.',
      demo: {
        groups: [
          ['nie dodawaj', 'nie wymyslaj', 'nie zmieniaj', 'wylacznie', 'tylko informacj', 'tylko to', 'zachowaj', 'bez dodawania', 'wiern', 'nie dopisuj'],
          ['zaznacz', 'oznacz', 'niejasn', 'brakuj', 'niepewn', 'sprzeczn', 'do wyjasnienia', 'pytan', 'watpliw'],
        ],
        full: 2,
      },
    },
    {
      id: 'odbiorca',
      skill: 'kontekst',
      weight: 15,
      label: 'Odbiorca',
      description: 'Wiadomo, kto przeczyta podsumowanie.',
      missingPhrase: 'odbiorcy podsumowania',
      tip: 'Dopisz: „dla kierownika zmiany, który zaplanuje prace”.',
      praise: 'Wskazujesz odbiorcę.',
      demo: { groups: [['zespol', 'brygad', 'kierownik', 'dyspozytor', 'przelozon', 'zmian', 'pracownik', 'mistrz']], full: 1 },
    },
    {
      id: 'ograniczenia',
      skill: 'ograniczenia',
      weight: 20,
      label: 'Długość i język',
      description: 'Określona długość i styl, np. zwięźle, technicznie, z zachowaniem oznaczeń.',
      missingPhrase: 'długości i stylu tekstu',
      tip: 'Dodaj np. „zwięźle, maks. pół strony, zachowaj oznaczenia komór i węzłów”.',
      praise: 'Określasz długość i styl.',
      demo: {
        groups: [
          ['krotk', 'zwiezl', 'strona', 'slow', 'zdan', 'maksymaln'],
          ['jezyk', 'styl', 'rzeczow', 'technicz', 'profesjonal', 'oznaczen', 'symbol', 'jednostk'],
        ],
        full: 2,
      },
    },
  ],
  examplePrompt:
    'Uporządkuj poniższą roboczą notatkę z obchodu sieci w czytelne podsumowanie dla kierownika zmiany.\n\nUkład:\n1) Sprawy pilne (w tym BHP) — tabela: lokalizacja – problem – proponowane działanie.\n2) Pozostałe sprawy — ta sama tabela.\n3) Do wyjaśnienia — lista pytań i niejasności z notatki.\n\nNie dodawaj informacji, których nie ma w notatce, i zachowaj oznaczenia komór (K-…) i węzłów (W-…). Jeśli coś jest niejasne lub sprzeczne, oznacz to jako „do wyjaśnienia”. Zwięźle, maksymalnie pół strony.\n\n[notatka]',
  exampleWhy: [
    'Cel i odbiorca są jasne.',
    'Układ wyniku jest dokładnie opisany — z podziałem na pilność.',
    'Zakaz dopisywania i sekcja „do wyjaśnienia” chronią przed zmyśleniami.',
    'Oznaczenia techniczne zostają zachowane.',
  ],
  verifyTip:
    'Sprawdź, czy każda sprawa z notatki trafiła do podsumowania (np. brak pokrywy włazu w K-12) i czy AI nie dopisała nowych faktów.',
  minWords: 20,
};
