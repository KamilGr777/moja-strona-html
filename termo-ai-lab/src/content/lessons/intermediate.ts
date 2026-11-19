import type { Lesson } from '../types';
import { NOTATKA_OBCHOD } from '../materials';
import { formatPl, hourLabel, TEMP_DATASET, tempStats, tempTableText } from '../chartData';

const st = tempStats();
const minDeltaHour = hourLabel(st.minDeltaHours[0]);

export const LESSON_ROZBUDOWANE: Lesson = {
  id: 's-rozbudowane',
  level: 'sredni',
  moduleId: 's1',
  number: 1,
  title: 'Rozbudowane polecenia: rola, struktura, ograniczenia',
  subtitle: 'Jak sprawić, by AI pracowała jak doświadczony współpracownik.',
  minutes: 7,
  icon: 'layout',
  outcomes: [
    'Dodajesz do promptu rolę, strukturę wyniku i ograniczenia.',
    'Oddzielasz instrukcję od danych i zabezpieczasz się przed zmyśleniami.',
    'Przygotowujesz z AI szkic raportu, który łatwo sprawdzić.',
  ],
  skills: ['struktura', 'format', 'ograniczenia', 'dane'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Od prostego polecenia do instrukcji eksperta',
      lead: 'Na tym poziomie dodajesz do promptu elementy, dzięki którym AI pracuje jak doświadczony współpracownik — i daje wynik, który łatwo sprawdzić.',
      blocks: [
        { icon: 'users', title: 'Rola', text: '„Jesteś specjalistą ds. eksploatacji sieci…” — AI dobiera słownictwo, perspektywę i poziom szczegółów.' },
        { icon: 'list', title: 'Struktura wyniku', text: 'Rozpisz sekcje: podsumowanie, tabela, problemy, plan. Wynik łatwiej przeczytać i porównać z danymi.' },
        { icon: 'lock', title: 'Ograniczenia', text: 'Długość, styl i zakazy: „nie dodawaj własnych liczb”, „bez żargonu”, „maks. jedna strona”.' },
        { icon: 'file', title: 'Wzór', text: 'Możesz pokazać przykład: „zachowaj styl poniższego fragmentu raportu” (bez danych poufnych).' },
        { icon: 'check', title: 'Kontrola', text: 'Poproś o oznaczenie braków i niepewności — np. [BRAK DANYCH].' },
      ],
      callout: { tone: 'info', text: 'Rola nie czyni AI ekspertem — nadal może się mylić. Pomaga jednak dobrać język i perspektywę.' },
    },
    {
      type: 'compare',
      stage: 'porownaj',
      title: 'Raport bez struktury i ze strukturą',
      situation: 'Trzeba przygotować miesięczny raport z prac eksploatacyjnych za październik.',
      weak: {
        prompt: 'Napisz raport z prac za październik.',
        result: '„W październiku zespół wykonał liczne prace eksploatacyjne, w tym przeglądy i naprawy. Wszystkie zadania zrealizowano zgodnie z planem, a sieć pracowała stabilnie.”',
        problems: [
          'AI nie miała danych, więc napisała ogólnik.',
          'Zmyśliła, że „wszystko zgodnie z planem” — a 2 przeglądy przełożono.',
          'Brak struktury, odbiorcy i liczb — raport nie nadaje się do użytku.',
        ],
      },
      strong: {
        prompt:
          'Jesteś specjalistą ds. eksploatacji. Przygotuj szkic raportu za październik dla kierownika działu. Korzystaj wyłącznie z poniższego zestawienia. Sekcje: 1) podsumowanie (3 zdania), 2) tabela plan–wykonanie, 3) problemy, 4) propozycje na listopad (do decyzji kierownika). Maks. 1 strona. Braki oznacz [BRAK DANYCH].\n\n[zestawienie prac]',
        result:
          '1) Podsumowanie: W październiku wykonano 14 z 16 zaplanowanych przeglądów komór (2 przełożono z powodu braku dostępu) i usunięto 3 awarie…\n2) Tabela: Przeglądy komór | 16 | 14 | 2 przełożone…\n3) Problemy: brak części zamiennych do pomp w węźle W-22 (zamówienie w toku)…\n4) Propozycje (do decyzji kierownika): …',
        strengths: [
          'Rola, odbiorca i okres są jasne.',
          'Zakaz dodawania liczb chroni przed zmyśleniami.',
          'Struktura sprawia, że każdą liczbę łatwo sprawdzić w zestawieniu.',
        ],
      },
      takeaway: 'Im bardziej złożone zadanie, tym ważniejsza struktura wyniku i jasne granice: z czego AI korzysta, a czego nie dodaje.',
    },
    {
      type: 'match',
      stage: 'sprobuj',
      title: 'Rozłóż rozbudowany prompt na części',
      instruction: 'Przypisz każdy fragment do elementu rozbudowanego polecenia.',
      categories: [
        { id: 'rola', label: 'Rola' },
        { id: 'kontekst', label: 'Kontekst' },
        { id: 'dane', label: 'Dane i źródło' },
        { id: 'struktura', label: 'Struktura wyniku' },
        { id: 'ograniczenia', label: 'Ograniczenia' },
      ],
      items: [
        { id: 'm1', text: 'Jesteś specjalistą ds. eksploatacji sieci ciepłowniczej.', category: 'rola', explanation: 'Nadaje AI perspektywę — to rola.' },
        { id: 'm2', text: 'Raport trafi do kierownika działu i dotyczy października.', category: 'kontekst', explanation: 'Odbiorca i okres — kontekst.' },
        { id: 'm3', text: 'Korzystaj wyłącznie z poniższego zestawienia prac.', category: 'dane', explanation: 'Wskazuje źródło danych i ogranicza AI do niego.' },
        { id: 'm4', text: 'Sekcje: podsumowanie, tabela plan–wykonanie, problemy, propozycje.', category: 'struktura', explanation: 'Opisuje układ wyniku — struktura.' },
        { id: 'm5', text: 'Maksymalnie jedna strona, styl rzeczowy, bez żargonu.', category: 'ograniczenia', explanation: 'Długość i styl — ograniczenia.' },
        { id: 'm6', text: 'Propozycje oznacz jako „do decyzji kierownika”.', category: 'ograniczenia', explanation: 'Wyznacza granicę odpowiedzialności — to też ograniczenie.' },
      ],
      skill: 'struktura',
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-raport-miesieczny' },
    {
      type: 'choice',
      stage: 'popraw',
      title: 'Najlepsze zabezpieczenie przed zmyśleniami',
      question: 'Który dopisek najlepiej chroni raport przed zmyślonymi liczbami?',
      promptStyle: true,
      options: [
        { id: 'a', text: 'Bądź bardzo dokładny.', correct: false, explanation: 'Ogólny apel nie mówi AI, co ma zrobić, gdy brakuje danych.' },
        {
          id: 'b',
          text: 'Korzystaj wyłącznie z poniższego zestawienia. Jeśli brakuje danych, wpisz [BRAK DANYCH] zamiast szacować.',
          correct: true,
          explanation: 'Wskazuje źródło i mówi, co robić z brakami. Braki będą widoczne, zamiast zostać zamaskowane.',
        },
        { id: 'c', text: 'Nie popełniaj błędów.', correct: false, explanation: 'AI nie wie, że się myli — potrzebuje konkretnej procedury, a nie zakazu.' },
      ],
      skill: 'weryfikacja',
    },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Gdzie najlepiej umieścić w prompcie długie dane, np. zestawienie prac?',
          options: [
            { id: 'a', text: 'Po instrukcji, wyraźnie oddzielone (np. nagłówkiem „DANE:”).', correct: true, explanation: 'Tak. Oddzielenie instrukcji od danych zmniejsza ryzyko pomyłek.' },
            { id: 'b', text: 'Wymieszane z instrukcją, zdanie po zdaniu.', correct: false, explanation: 'AI łatwiej wtedy pomyli polecenie z treścią danych.' },
            { id: 'c', text: 'Nie trzeba ich wklejać — AI zna dane firmy.', correct: false, explanation: 'AI nie zna danych Twojej firmy, jeśli ich nie podasz.' },
          ],
          skill: 'dane',
        },
        {
          id: 'q2',
          question: 'Co daje nadanie AI roli („Jesteś specjalistą ds. eksploatacji…”)?',
          options: [
            { id: 'a', text: 'AI przestaje popełniać błędy.', correct: false, explanation: 'Rola nie zwiększa wiedzy ani nieomylności.' },
            { id: 'b', text: 'AI dobiera język i perspektywę, ale nadal może się mylić.', correct: true, explanation: 'Dokładnie tak — rola to wskazówka stylu i perspektywy.' },
            { id: 'c', text: 'Nic — to tylko ozdobnik.', correct: false, explanation: 'Rola realnie wpływa na styl i dobór informacji.' },
          ],
          skill: 'struktura',
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Rozbudowany prompt = rola + kontekst + dane + struktura wyniku + ograniczenia + kontrola.',
      details: [
        'Oddzielaj instrukcję od danych.',
        'Rozpisz sekcje wyniku — łatwiej sprawdzić każdą liczbę.',
        'Każ oznaczać braki zamiast je zgadywać.',
      ],
      tryAtWork: 'Zapisz swój najlepszy prompt do raportu jako szablon — przyda się co miesiąc.',
    },
  ],
};

export const LESSON_WYKRESY: Lesson = {
  id: 's-wykresy',
  level: 'sredni',
  moduleId: 's4',
  number: 2,
  title: 'Wykresy i dane: rzetelna analiza z AI',
  subtitle: 'Jak poprosić AI o opis danych i sprawdzić odpowiedź z wartościami źródłowymi.',
  minutes: 8,
  icon: 'chart',
  outcomes: [
    'Wiesz, jak przekazać AI dane liczbowe, aby poprawnie je opisała.',
    'Zadajesz mierzalne pytania i wymagasz pokazania obliczeń.',
    'Porównujesz odpowiedź AI z wartościami źródłowymi i wychwytujesz błędy.',
  ],
  skills: ['dane', 'weryfikacja', 'cel'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Jak AI pracuje z danymi',
      blocks: [
        { icon: 'chart', title: 'Liczby zamiast obrazka', text: 'Najpewniej pracuje się na tabeli z liczbami. Część asystentów potrafi odczytać zdjęcie wykresu, ale wtedy łatwiej o błąd odczytu. Jeśli masz dane — wklej tabelę.' },
        { icon: 'info', title: 'Opisz dane', text: 'Co oznaczają kolumny, jakie są jednostki, jaki okres i krok czasowy pomiarów.' },
        { icon: 'target', title: 'Pytaj mierzalnie', text: 'Maksimum, minimum, średnia, godzina zdarzenia — takie odpowiedzi łatwo sprawdzić.' },
        { icon: 'alert', title: 'Dane to nie przyczyna', text: 'Dane pokazują, CO się stało — rzadko DLACZEGO. Przyczyny niech AI podaje jako hipotezy do sprawdzenia.' },
      ],
    },
    {
      type: 'chart',
      stage: 'zobacz',
      title: 'Odczytaj wykres',
      instruction: `${TEMP_DATASET.description} Najedź na wykres lub otwórz tabelę, aby zobaczyć dokładne wartości.`,
      chartId: TEMP_DATASET.id,
      questions: [
        {
          id: 'c1',
          question: 'O której godzinie różnica temperatur zasilania i powrotu (ΔT) była najmniejsza?',
          options: [
            { id: 'a', text: '08:00', correct: false, explanation: `O 08:00 ΔT wynosiła ${96 - 56} K — to typowa wartość.` },
            { id: 'b', text: minDeltaHour, correct: true, explanation: `Tak — o ${minDeltaHour} ΔT spadła do ${st.minDelta} K.` },
            { id: 'c', text: '19:00', correct: false, explanation: 'O 19:00 ΔT wynosiła 39 K — to typowa wartość.' },
          ],
          skill: 'dane',
        },
        {
          id: 'c2',
          question: 'Co działo się z temperaturą powrotu między 14:00 a 16:00?',
          options: [
            { id: 'a', text: 'Wyraźnie wzrosła, choć temperatura zasilania była niemal stała.', correct: true, explanation: `Powrót wzrósł do ${st.maxRet} °C przy zasilaniu ok. 90 °C — to nietypowy fragment doby.` },
            { id: 'b', text: 'Wyraźnie spadła.', correct: false, explanation: 'Spójrz na turkusową linię — w tych godzinach idzie w górę.' },
            { id: 'c', text: 'Nie zmieniła się.', correct: false, explanation: 'Zmiana jest wyraźna: z ok. 54 °C do 65 °C.' },
          ],
          skill: 'dane',
        },
      ],
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-analiza-wykresu' },
    {
      type: 'findError',
      stage: 'sprobuj',
      title: 'Sprawdź analizę AI z danymi źródłowymi',
      instruction: 'AI przeanalizowała dane z wykresu. Porównaj każde zdanie z tabelą i zaznacz te, które są błędne lub nieuprawnione.',
      source: { title: 'Tabela danych źródłowych', content: tempTableText() },
      chartId: TEMP_DATASET.id,
      answerTitle: 'Analiza przygotowana przez AI',
      statements: [
        {
          id: 's1',
          text: `Najwyższa temperatura zasilania wyniosła ${st.maxSupply} °C i wystąpiła rano (${st.maxSupplyHours.map(hourLabel).join(' i ')}).`,
          isError: false,
          explanation: 'Zgadza się z tabelą.',
        },
        {
          id: 's2',
          text: 'Temperatura zasilania przez całą dobę nie spadła poniżej 90 °C.',
          isError: true,
          explanation: `Błąd: o ${st.minSupplyHours.map(hourLabel).join(' i ')} zasilanie wynosiło ${st.minSupply} °C, a o 02:00 i 23:00 — 89 °C.`,
        },
        {
          id: 's3',
          text: `Najmniejsza różnica temperatur (ΔT) wyniosła ${st.minDelta} K o godzinie ${minDeltaHour}.`,
          isError: false,
          explanation: 'Zgadza się z tabelą.',
        },
        {
          id: 's4',
          text: 'Średnia różnica temperatur w ciągu doby wyniosła około 42 K.',
          isError: true,
          explanation: `Błąd obliczeniowy: średnia ΔT z doby to ok. ${formatPl(st.avgDelta)} K. Dlatego warto prosić AI o pokazanie obliczeń.`,
        },
        {
          id: 's5',
          text: 'Wzrost temperatury powrotu w godz. 14:00–16:00 na pewno wynika z awarii wymiennika w węźle W-12.',
          isError: true,
          critical: true,
          explanation: 'Nieuprawniony wniosek: dane z magistrali nie wskazują żadnego węzła ani przyczyny. To może być hipoteza do sprawdzenia, nie fakt.',
        },
        { id: 's6', text: `Najwyższa temperatura powrotu wyniosła ${st.maxRet} °C.`, isError: false, explanation: 'Zgadza się z tabelą.' },
        {
          id: 's7',
          text: 'Od godziny 17:00 różnica temperatur wróciła do typowego zakresu ok. 37–39 K.',
          isError: false,
          explanation: 'Zgadza się: od 17:00 ΔT wynosi 37–39 K.',
        },
      ],
      skill: 'weryfikacja',
    },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Jak najszybciej sprawdzić średnią podaną przez AI?',
          options: [
            { id: 'a', text: 'Zapytać AI ponownie o to samo.', correct: false, explanation: 'AI może powtórzyć błąd albo podać inną wartość — to nie jest weryfikacja.' },
            { id: 'b', text: 'Poprosić o pokazanie obliczeń i sprawdzić je, np. w arkuszu kalkulacyjnym.', correct: true, explanation: 'Tak. Pokazane obliczenia i niezależne sprawdzenie to najpewniejsza droga.' },
            { id: 'c', text: 'Uznać wynik, jeśli inne wartości się zgadzają.', correct: false, explanation: 'Jedna poprawna wartość nie gwarantuje poprawności pozostałych.' },
          ],
          skill: 'weryfikacja',
        },
        {
          id: 'q2',
          question: 'AI pisze, że wzrost temperatury powrotu „na pewno” wynika z awarii konkretnego urządzenia, choć w danych nie ma o nim informacji. Co to jest?',
          options: [
            { id: 'a', text: 'Trafna diagnoza — AI zna typowe przyczyny.', correct: false, explanation: 'Znajomość typowych przyczyn nie uprawnia do pewności w konkretnym przypadku.' },
            { id: 'b', text: 'Nieuprawniony wniosek — może być najwyżej hipotezą do sprawdzenia.', correct: true, explanation: 'Dokładnie. Decyzje eksploatacyjne opierają się na sprawdzeniu, nie na domysłach.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Dane → mierzalne pytania → pokazane obliczenia → porównanie z wartościami źródłowymi.',
      details: [
        'Wklejaj tabelę z liczbami i opisz kolumny oraz jednostki.',
        'Proś o obliczenia krok po kroku.',
        'Przyczyny traktuj jako hipotezy — dane rzadko mówią „dlaczego”.',
      ],
      tryAtWork: 'Weź niewielki, zanonimizowany wycinek danych pomiarowych i poproś AI o opis z pokazaniem obliczeń. Sprawdź dwie wartości samodzielnie.',
    },
  ],
};

export const LESSON_DOKUMENTY: Lesson = {
  id: 's-dokumenty',
  level: 'sredni',
  moduleId: 's2',
  number: 3,
  title: 'Dokumenty techniczne i rozmowa wieloetapowa',
  subtitle: 'Porządkowanie notatek i prowadzenie AI przez kolejne kroki.',
  minutes: 8,
  icon: 'file',
  outcomes: [
    'Zamieniasz chaotyczne notatki w czytelne dokumenty z pomocą AI.',
    'Pilnujesz wierności źródłu i oznaczania niejasności.',
    'Prowadzisz rozmowę wieloetapową: porządek → uzupełnienie → wnioski.',
  ],
  skills: ['format', 'weryfikacja', 'iteracja'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Porządkowanie dokumentów z AI',
      blocks: [
        { icon: 'file', title: 'Notatki, protokoły, instrukcje', text: 'AI szybko zamienia zapis roboczy w czytelny dokument: tabelę, listę zadań, podsumowanie.' },
        { icon: 'list', title: 'Ty wybierasz układ', text: 'Powiedz, jak ma wyglądać wynik: tabela z kolumnami, podział według pilności, sekcje.' },
        { icon: 'eye', title: 'Wierność źródłu', text: 'Najczęstszy problem: AI „wygładza” tekst i dopisuje rzeczy, których nie było. Wymagaj oznaczania niejasności.' },
        { icon: 'repeat', title: 'Pracuj etapami', text: 'Długie zadania dziel na kroki: najpierw porządek, potem uzupełnienia, potem e-mail lub lista zadań.' },
      ],
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-notatka-porzadkowanie' },
    {
      type: 'chat',
      stage: 'popraw',
      title: 'Rozmowa wieloetapowa: od notatki do planu działań',
      instruction: 'Symulacja z przygotowanymi odpowiedziami. Notatka z obchodu jest już uporządkowana — wybieraj kolejne kroki rozmowy.',
      firstMessage:
        'Uporządkuj poniższą notatkę z obchodu w tabelę: lokalizacja – problem – działanie – pilność. Nie dodawaj informacji spoza notatki.\n\n[notatka z obchodu]',
      start: 'n1',
      nodes: {
        n1: {
          ai: 'Lokalizacja | Problem | Działanie | Pilność\nK-12 | woda na dnie ok. 20 cm | wypompować | wysoka?\nK-12 | skorodowana drabina (BHP) | wymiana / zabezpieczenie | wysoka\nK-12 | brak pokrywy na jednym włazie, zabezpieczone taśmą | zamontować pokrywę | wysoka\nK-12 | zawór ZO-3 chodzi ciężko | przegląd zaworu | średnia\nW-27 | podejrzenie uszkodzenia manometru na powrocie | wymiana manometru | średnia\nK-14–K-15 | częściowo zdjęta izolacja | zgłoszenie | średnia\nW-31 | mały wyciek na dławicy pompy | naprawa | średnia',
          choices: [
            {
              text: 'Dodaj sekcję „Do wyjaśnienia” i przenieś tam sprawy niejasne z notatki (np. kto zdjął izolację, termin przeglądu W-27, wcześniejsze zgłoszenie W-31).',
              next: 'n2',
              good: true,
              feedback: 'Świetnie! Niejasności są teraz widoczne, a nie ukryte w tabeli.',
            },
            {
              text: 'Napisz od razu e-mail do działu inwestycji, że izolację zniszczył wykonawca.',
              next: 'n1b',
              good: false,
              feedback: 'W notatce jest „nie wiem kto”. Taki e-mail zawierałby bezpodstawne oskarżenie — AI napisałaby go przekonująco.',
            },
          ],
        },
        n1b: {
          ai: '(Zatrzymajmy się: w notatce nie ma informacji, kto zdjął izolację. Wróć do porządkowania.)',
          choices: [
            {
              text: 'Dodaj sekcję „Do wyjaśnienia” i przenieś tam sprawy niejasne z notatki (np. kto zdjął izolację, termin przeglądu W-27, wcześniejsze zgłoszenie W-31).',
              next: 'n2',
              good: true,
              feedback: 'Dobrze — najpierw porządek i niejasności, potem korespondencja.',
            },
          ],
        },
        n2: {
          ai: 'Do wyjaśnienia:\n• K-14–K-15: kto i kiedy zdjął izolację — brak informacji; ewentualne zgłoszenie do działu inwestycji wymaga potwierdzenia.\n• W-27: termin przeglądu — do sprawdzenia w harmonogramie.\n• W-31: wyciek był podobno zgłaszany w październiku — do weryfikacji w systemie zgłoszeń.\n• K-12: pilność wypompowania wody — w notatce ze znakiem zapytania.',
          choices: [
            {
              text: 'Na podstawie tabeli przygotuj listę 3 najpilniejszych działań na dziś, każde z jednozdaniowym uzasadnieniem.',
              next: 'n3',
              good: true,
              feedback: 'Bardzo dobrze — prosisz o priorytety z uzasadnieniem, które łatwo ocenisz.',
            },
            {
              text: 'Wszystko jest pilne — napisz to.',
              next: 'n2b',
              good: false,
              feedback: 'Gdy wszystko jest pilne, nic nie jest pilne. Poproś o priorytety z uzasadnieniem.',
            },
          ],
        },
        n2b: {
          ai: '(Lista „wszystko pilne” nie pomoże zaplanować dnia. Spróbuj poprosić o priorytety.)',
          choices: [
            {
              text: 'Na podstawie tabeli przygotuj listę 3 najpilniejszych działań na dziś, każde z jednozdaniowym uzasadnieniem.',
              next: 'n3',
              good: true,
              feedback: 'Tak — konkretna liczba i uzasadnienie.',
            },
          ],
        },
        n3: {
          ai: 'Propozycja priorytetów (do decyzji kierownika zmiany):\n1. K-12: zabezpieczenie skorodowanej drabiny — zagrożenie BHP przy każdym zejściu do komory.\n2. K-12: montaż pokrywy włazu — taśma to tylko zabezpieczenie tymczasowe.\n3. K-12: wypompowanie wody — utrudnia pracę i dostęp do zaworu ZO-3.',
          end: true,
        },
      },
      outro: 'Rozmowa wieloetapowa to: porządek → wyjaśnienie niejasności → wnioski. Każdy krok sprawdzasz, zanim przejdziesz dalej, a priorytety zatwierdza człowiek.',
      skill: 'iteracja',
    },
    {
      type: 'order',
      stage: 'popraw',
      title: 'Ułóż kroki pracy z długim dokumentem',
      instruction: 'Ustaw kroki w kolejności, w jakiej warto je wykonać. Użyj strzałek, aby przesuwać elementy.',
      items: [
        { id: 'o1', text: 'Usuń z dokumentu dane osobowe i informacje poufne.' },
        { id: 'o2', text: 'Wklej dokument i opisz cel oraz układ wyniku.' },
        { id: 'o3', text: 'Sprawdź wynik z oryginałem: liczby, nazwy, terminy.' },
        { id: 'o4', text: 'Doprecyzuj w tej samej rozmowie (np. dodaj kolumnę, skróć).' },
        { id: 'o5', text: 'Na tej podstawie przygotuj kolejne materiały (e-mail, lista zadań).' },
      ],
      explanation: 'Bezpieczeństwo jest pierwsze, sprawdzenie — zanim cokolwiek zbudujesz na wyniku. Błąd w podsumowaniu przeniósłby się do e-maila i listy zadań.',
      skill: 'iteracja',
    },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'W podsumowaniu AI napisała: „izolację zdjął wykonawca”. W notatce było: „nie wiem kto”. Co to jest?',
          context: NOTATKA_OBCHOD.title,
          options: [
            { id: 'a', text: 'Rozsądne uzupełnienie — zwykle robi to wykonawca.', correct: false, explanation: 'To domysł, nie informacja z notatki. W dokumencie służbowym może kogoś bezpodstawnie obciążyć.' },
            { id: 'b', text: 'Zmyślenie — informacji nie było w źródle.', correct: true, explanation: 'Tak. Dlatego wymagamy: „nie dodawaj informacji spoza notatki, niejasności oznacz”.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Dokument → układ wyniku → wierność źródłu → kolejne kroki w tej samej rozmowie.',
      details: [
        'Proponuj konkretny układ: tabela, kolumny, podział według pilności.',
        'Wymagaj sekcji „do wyjaśnienia” — niejasności nie mogą znikać.',
        'Buduj kolejne materiały dopiero na sprawdzonym wyniku.',
      ],
      tryAtWork: 'Weź jedną roboczą notatkę (bez danych osobowych) i poproś AI o tabelę z sekcją „do wyjaśnienia”.',
    },
  ],
};

export const INTERMEDIATE_LESSONS: Lesson[] = [LESSON_ROZBUDOWANE, LESSON_WYKRESY, LESSON_DOKUMENTY];
