import type { ClassifyStep, FindErrorStep, LevelId, OrderStep, QuizQuestion, RedactStep } from './types';
import { ODCZYTY_LICZNIKA, PROTOKOL_ODBIORU } from './materials';

/**
 * Sprawdziany „Oceń moje osiągnięcia”. Każdy obejmuje pięć obszarów:
 * zasady, pisanie promptu, poprawianie instrukcji, ocenę wiarygodności i zadanie praktyczne.
 */

export type AssessmentArea = 'zasady' | 'pisanie' | 'poprawianie' | 'wiarygodnosc' | 'praktyka';

export type AssessmentSection =
  | { id: string; area: AssessmentArea; title: string; kind: 'quiz'; questions: QuizQuestion[] }
  | { id: string; area: AssessmentArea; title: string; kind: 'trainer'; taskId: string }
  | { id: string; area: AssessmentArea; title: string; kind: 'step'; step: FindErrorStep | RedactStep | OrderStep | ClassifyStep };

export interface AssessmentDef {
  level: LevelId;
  title: string;
  intro: string;
  minutes: number;
  sections: AssessmentSection[];
}

export const AREA_INFO: Record<AssessmentArea, { label: string; weight: number; practiceHint: string; lessonId: Record<LevelId, string> }> = {
  zasady: {
    label: 'Zasady pracy z AI',
    weight: 15,
    practiceHint: 'Wróć do części „Zobacz” w lekcjach i zwróć uwagę na ograniczenia AI.',
    lessonId: { poczatkujacy: 'p-pierwsze-kroki', sredni: 's-rozbudowane', zaawansowany: 'z-wieloetapowe' },
  },
  pisanie: {
    label: 'Pisanie promptów',
    weight: 25,
    practiceHint: 'Ćwicz w Laboratorium promptów — zacznij od celu, kontekstu, danych i formy wyniku.',
    lessonId: { poczatkujacy: 'p-pierwsze-polecenie', sredni: 's-rozbudowane', zaawansowany: 'z-asystent' },
  },
  poprawianie: {
    label: 'Poprawianie instrukcji',
    weight: 20,
    practiceHint: 'Zrób ćwiczenia „Napraw polecenie” — szczególnie ćwiczenia celowane.',
    lessonId: { poczatkujacy: 'p-sprawdzanie', sredni: 's-dokumenty', zaawansowany: 'z-wieloetapowe' },
  },
  wiarygodnosc: {
    label: 'Ocena wiarygodności odpowiedzi',
    weight: 25,
    practiceHint: 'Ćwicz „Znajdź błąd AI”: porównuj liczby, daty i wnioski ze źródłem.',
    lessonId: { poczatkujacy: 'p-sprawdzanie', sredni: 's-wykresy', zaawansowany: 'z-testowanie' },
  },
  praktyka: {
    label: 'Zadanie praktyczne',
    weight: 15,
    practiceHint: 'Powtórz ćwiczenia praktyczne z lekcji tego poziomu.',
    lessonId: { poczatkujacy: 'p-sprawdzanie', sredni: 's-dokumenty', zaawansowany: 'z-testowanie' },
  },
};

const BEGINNER: AssessmentDef = {
  level: 'poczatkujacy',
  title: 'Sprawdzian gotowości — poziom początkujący',
  intro: 'Pięć krótkich zadań sprawdzi, czy swobodnie korzystasz z AI w prostych zadaniach i czy możesz przejść na poziom średni.',
  minutes: 10,
  sections: [
    {
      id: 'b-zasady',
      area: 'zasady',
      title: 'Zasady pracy z AI',
      kind: 'quiz',
      questions: [
        {
          id: 'bz1',
          question: 'Które polecenie da najlepszy wynik?',
          options: [
            { id: 'a', text: '„Napisz coś o awarii.”', correct: false, explanation: 'Brak celu, danych i formy.' },
            { id: 'b', text: '„Napisz 4-zdaniową informację dla zarządcy o awarii sieci przy ul. Lipowej (przerwa do 18:00). Ton rzeczowy.”', correct: true, explanation: 'Jest cel, odbiorca, dane i forma.' },
            { id: 'c', text: '„Jesteś geniuszem. Napisz najlepszy tekst o awarii.”', correct: false, explanation: 'Pochwały nie zastępują konkretów.' },
          ],
          skill: 'cel',
        },
        {
          id: 'bz2',
          question: 'Kiedy AI najczęściej podaje zmyślone informacje?',
          options: [
            { id: 'a', text: 'Gdy pytasz o fakty, których jej nie podałeś (np. dane Twojej sieci).', correct: true, explanation: 'AI nie zna tych faktów, więc „uzupełnia” je wiarygodnie brzmiącym tekstem.' },
            { id: 'b', text: 'Gdy prosisz o przeredagowanie Twojego tekstu.', correct: false, explanation: 'Przy redakcji ryzyko jest mniejsze — choć fakty i tak warto sprawdzić.' },
            { id: 'c', text: 'Nigdy — AI zawsze korzysta ze sprawdzonych źródeł.', correct: false, explanation: 'Niestety nie. AI może zmyślać, i to pewnym tonem.' },
          ],
          skill: 'weryfikacja',
        },
        {
          id: 'bz3',
          question: 'Chcesz przygotować komunikat dla odbiorców. Czy wklejasz do publicznego czatu AI listę odbiorców z adresami i telefonami?',
          options: [
            { id: 'a', text: 'Tak, AI lepiej dopasuje komunikat.', correct: false, explanation: 'AI nie potrzebuje danych osobowych do napisania komunikatu.' },
            { id: 'b', text: 'Nie — używam znaczników, a dane osobowe zostają poza AI.', correct: true, explanation: 'Tak. Znaczniki uzupełnisz samodzielnie.' },
          ],
          skill: 'bezpieczenstwo',
          critical: true,
        },
      ],
    },
    { id: 'b-pisanie', area: 'pisanie', title: 'Napisz prompt', kind: 'trainer', taskId: 'a-p-napisz' },
    { id: 'b-poprawianie', area: 'poprawianie', title: 'Popraw instrukcję', kind: 'trainer', taskId: 'a-p-popraw' },
    {
      id: 'b-wiarygodnosc',
      area: 'wiarygodnosc',
      title: 'Oceń wiarygodność odpowiedzi',
      kind: 'step',
      step: {
        type: 'findError',
        stage: 'sprobuj',
        title: 'Sprawdź streszczenie protokołu',
        instruction: 'AI streściła protokół odbioru. Zaznacz zdania błędne lub nieuprawnione.',
        source: PROTOKOL_ODBIORU,
        answerTitle: 'Streszczenie AI',
        statements: [
          { id: 's1', text: 'Próba szczelności zakończyła się wynikiem pozytywnym.', isError: false, explanation: 'Zgadza się z protokołem.' },
          { id: 's2', text: 'Komisja dokonała odbioru bez zastrzeżeń.', isError: true, critical: true, explanation: 'Błąd: odbiór jest warunkowy — po usunięciu usterek.' },
          { id: 's3', text: 'Stwierdzono 3 usterki, m.in. brak oznaczenia trasy taśmą ostrzegawczą.', isError: false, explanation: 'Zgadza się.' },
          { id: 's4', text: 'Usterki należy usunąć w ciągu 30 dni.', isError: true, explanation: 'Błąd: termin wynosi 14 dni.' },
          { id: 's5', text: 'Długość przyłącza wynosi 64 m.', isError: false, explanation: 'Zgadza się.' },
        ],
        skill: 'weryfikacja',
      },
    },
    {
      id: 'b-praktyka',
      area: 'praktyka',
      title: 'Zadanie praktyczne: anonimizacja',
      kind: 'step',
      step: {
        type: 'redact',
        stage: 'sprobuj',
        title: 'Przygotuj zgłoszenie do wklejenia do AI',
        instruction: 'Kliknij fragmenty, które trzeba ukryć przed wklejeniem do AI. Nie ukrywaj informacji potrzebnych do sprawy.',
        segments: [
          { text: 'Zgłoszenie z 14.11: ' },
          { text: 'Pan Piotr Zieliński', selectable: true, sensitive: true, category: 'imię i nazwisko', replacement: '[OSOBA]' },
          { text: ', ' },
          { text: 'ul. Brzozowa 3/7', selectable: true, sensitive: true, category: 'adres', replacement: '[ADRES]' },
          { text: ', tel. ' },
          { text: '512 345 678', selectable: true, sensitive: true, category: 'telefon', replacement: '[TELEFON]' },
          { text: ', zgłasza ' },
          { text: 'hałas w instalacji grzewczej w nocy', selectable: true, sensitive: false },
          { text: '. Budynek zasilany z ' },
          { text: 'węzła W-31', selectable: true, sensitive: false },
          { text: '.' },
        ],
        afterword: 'Oznaczenie węzła i opis problemu są potrzebne do sprawy i nie są danymi osobowymi.',
        skill: 'bezpieczenstwo',
      },
    },
  ],
};

const INTERMEDIATE: AssessmentDef = {
  level: 'sredni',
  title: 'Sprawdzian gotowości — poziom średni',
  intro: 'Sprawdzimy, czy wykorzystujesz AI do pracy z dokumentami i danymi oraz czy możesz przejść na poziom zaawansowany.',
  minutes: 12,
  sections: [
    {
      id: 's-zasady',
      area: 'zasady',
      title: 'Zasady pracy z AI',
      kind: 'quiz',
      questions: [
        {
          id: 'sz1',
          question: 'Masz zdjęcie wykresu i tabelę danych, z której powstał. Co przekazać AI do obliczeń?',
          options: [
            { id: 'a', text: 'Tabelę z liczbami, z opisem kolumn i jednostek.', correct: true, explanation: 'Liczby z tabeli eliminują błędy odczytu wykresu.' },
            { id: 'b', text: 'Tylko zdjęcie wykresu — AI i tak „widzi” obraz.', correct: false, explanation: 'Odczyt wartości z obrazu jest mniej dokładny niż dane źródłowe.' },
          ],
          skill: 'dane',
        },
        {
          id: 'sz2',
          question: 'Po co oddzielać w prompcie instrukcję od wklejonych danych (np. nagłówkiem „DANE:”)?',
          options: [
            { id: 'a', text: 'Żeby AI nie pomyliła treści danych z poleceniem.', correct: true, explanation: 'Tak — wyraźna granica zmniejsza ryzyko pomyłek.' },
            { id: 'b', text: 'Bez znaczenia, to kwestia estetyki.', correct: false, explanation: 'Ma znaczenie, zwłaszcza przy długich danych.' },
          ],
          skill: 'struktura',
        },
        {
          id: 'sz3',
          question: 'AI pisze, że spadek liczby zgłoszeń „na pewno” wynika z modernizacji węzłów, choć w danych są tylko liczby zgłoszeń. Jak to traktujesz?',
          options: [
            { id: 'a', text: 'Jako hipotezę, którą trzeba sprawdzić — dane nie wskazują przyczyny.', correct: true, explanation: 'Tak. Mogła to być np. cieplejsza pogoda.' },
            { id: 'b', text: 'Jako wniosek do raportu — brzmi logicznie.', correct: false, explanation: '„Brzmi logicznie” to nie dowód. Taki wniosek może wprowadzić w błąd decydentów.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
      ],
    },
    { id: 's-pisanie', area: 'pisanie', title: 'Napisz prompt', kind: 'trainer', taskId: 'a-s-napisz' },
    { id: 's-poprawianie', area: 'poprawianie', title: 'Popraw instrukcję', kind: 'trainer', taskId: 'a-s-popraw' },
    {
      id: 's-wiarygodnosc',
      area: 'wiarygodnosc',
      title: 'Oceń wiarygodność analizy',
      kind: 'step',
      step: {
        type: 'findError',
        stage: 'sprobuj',
        title: 'Sprawdź analizę zgłoszeń',
        instruction: 'Porównaj analizę AI z danymi i zaznacz zdania błędne lub nieuprawnione.',
        source: {
          title: 'Zgłoszenia „zbyt niska temperatura” w sezonie (dane fikcyjne)',
          content: 'październik: 12\nlistopad: 31\ngrudzień: 58\nstyczeń: 64\nluty: 40\nmarzec: 18',
        },
        answerTitle: 'Analiza AI',
        statements: [
          { id: 's1', text: 'Najwięcej zgłoszeń było w styczniu (64).', isError: false, explanation: 'Zgadza się.' },
          { id: 's2', text: 'Łącznie w sezonie zgłoszono 213 przypadków.', isError: true, explanation: 'Błąd sumy: 12 + 31 + 58 + 64 + 40 + 18 = 223.' },
          { id: 's3', text: 'Od listopada do grudnia liczba zgłoszeń wzrosła o ok. 87%.', isError: false, explanation: 'Zgadza się: (58 − 31) / 31 ≈ 87%.' },
          { id: 's4', text: 'Spadek zgłoszeń w marcu dowodzi, że modernizacja węzłów przyniosła efekt.', isError: true, critical: true, explanation: 'Nieuprawniony wniosek — dane nie mówią nic o modernizacji. Prawdopodobnie wpływ miała temperatura zewnętrzna.' },
          { id: 's5', text: 'W lutym zgłoszeń było mniej niż w grudniu.', isError: false, explanation: 'Zgadza się: 40 < 58.' },
        ],
        skill: 'weryfikacja',
      },
    },
    {
      id: 's-praktyka',
      area: 'praktyka',
      title: 'Zadanie praktyczne: proces pracy z danymi',
      kind: 'step',
      step: {
        type: 'order',
        stage: 'sprobuj',
        title: 'Ułóż kroki pracy z danymi',
        instruction: 'Ustaw kroki w najlepszej kolejności.',
        items: [
          { id: 'o1', text: 'Usuń dane osobowe i ogranicz tabelę do potrzebnych kolumn.' },
          { id: 'o2', text: 'Opisz dane i zadaj mierzalne pytania.' },
          { id: 'o3', text: 'Poproś o pokazanie obliczeń.' },
          { id: 'o4', text: 'Sprawdź kluczowe wartości ze źródłem.' },
          { id: 'o5', text: 'Przygotuj wnioski jako hipotezy do decyzji.' },
        ],
        explanation: 'Najpierw bezpieczeństwo, potem jasne pytania, a wnioski dopiero po sprawdzeniu liczb.',
        skill: 'iteracja',
      },
    },
  ],
};

const ADVANCED: AssessmentDef = {
  level: 'zaawansowany',
  title: 'Sprawdzian gotowości — poziom zaawansowany',
  intro: 'Sprawdzimy, czy projektujesz bezpieczne, sprawdzalne procesy pracy z AI i jesteś gotowy do samodzielnej pracy na tym poziomie.',
  minutes: 15,
  sections: [
    {
      id: 'z-zasady',
      area: 'zasady',
      title: 'Zasady pracy z AI',
      kind: 'quiz',
      questions: [
        {
          id: 'zz1',
          question: 'Co najlepiej sprawdza, czy nowa instrukcja analityczna działa poprawnie?',
          options: [
            { id: 'a', text: 'Uruchomienie jej na danych, dla których znam poprawny wynik.', correct: true, explanation: 'Przypadek testowy ze znanym wynikiem to najpewniejszy sprawdzian.' },
            { id: 'b', text: 'Zapytanie AI, czy instrukcja jest dobra.', correct: false, explanation: 'To opinia, nie test.' },
          ],
          skill: 'weryfikacja',
        },
        {
          id: 'zz2',
          question: 'Gdzie w wieloetapowej instrukcji umieścić punkt kontrolny?',
          options: [
            { id: 'a', text: 'Po etapach, których wynik wpływa na dalsze wnioski.', correct: true, explanation: 'Tak — błąd poprawiony wcześnie nie przeniesie się dalej.' },
            { id: 'b', text: 'Tylko na samym końcu.', correct: false, explanation: 'Wtedy błąd zdąży wpłynąć na wszystkie wnioski.' },
          ],
          skill: 'iteracja',
        },
        {
          id: 'zz3',
          question: 'Asystent AI ma dostęp do danych pomiarowych z sieci. Czy może sam wydawać polecenia przełączeń lub wyłączeń?',
          options: [
            { id: 'a', text: 'Nie — może przygotować analizę i propozycje, decyzję podejmuje kompetentny człowiek.', correct: true, explanation: 'Tak. Odpowiedzialność za decyzje eksploatacyjne pozostaje po stronie ludzi.' },
            { id: 'b', text: 'Tak, jeśli dane jednoznacznie wskazują problem.', correct: false, explanation: 'AI nie powinna samodzielnie sterować infrastrukturą ani podejmować decyzji bezpieczeństwa.' },
          ],
          skill: 'bezpieczenstwo',
          critical: true,
        },
      ],
    },
    { id: 'z-pisanie', area: 'pisanie', title: 'Zaprojektuj instrukcję', kind: 'trainer', taskId: 'a-z-napisz' },
    { id: 'z-poprawianie', area: 'poprawianie', title: 'Popraw ryzykowną instrukcję', kind: 'trainer', taskId: 'a-z-popraw' },
    {
      id: 'z-wiarygodnosc',
      area: 'wiarygodnosc',
      title: 'Sprawdź obliczenia',
      kind: 'step',
      step: {
        type: 'findError',
        stage: 'sprobuj',
        title: 'Zweryfikuj obliczenia zużycia ciepła',
        instruction: 'AI policzyła zużycie ciepła z odczytów licznika. Zaznacz błędy i nieuprawnione wnioski.',
        source: ODCZYTY_LICZNIKA,
        answerTitle: 'Obliczenia AI',
        statements: [
          { id: 's1', text: 'Zużycie w październiku: 12 742,9 − 12 480,5 = 262,4 GJ.', isError: false, explanation: 'Poprawnie.' },
          { id: 's2', text: 'Zużycie w listopadzie: 13 118,2 − 12 742,9 = 385,3 GJ.', isError: true, explanation: 'Błąd odejmowania: poprawnie 375,3 GJ.' },
          { id: 's3', text: 'Łącznie w dwóch miesiącach: 637,7 GJ, czyli ok. 177,1 MWh.', isError: false, explanation: 'Poprawnie: 262,4 + 375,3 = 637,7 GJ; 637,7 / 3,6 ≈ 177,1 MWh.' },
          { id: 's4', text: 'Wzrost zużycia w listopadzie oznacza nieszczelność instalacji w budynku.', isError: true, critical: true, explanation: 'Nieuprawniony wniosek — wzrost zużycia w listopadzie jest typowy dla sezonu grzewczego.' },
        ],
        skill: 'weryfikacja',
      },
    },
    {
      id: 'z-praktyka',
      area: 'praktyka',
      title: 'Zadanie praktyczne: podział ról',
      kind: 'step',
      step: {
        type: 'classify',
        stage: 'sprobuj',
        title: 'AI czy człowiek?',
        instruction: 'Przypisz każdy krok do wykonawcy w procesie pracy z AI.',
        buckets: [
          { id: 'ai', label: 'AI może wykonać (pod nadzorem)', tone: 'info' },
          { id: 'czlowiek', label: 'Wykonuje lub decyduje człowiek', tone: 'warn' },
        ],
        items: [
          { id: 'i1', text: 'Szkic harmonogramu przeglądów na podstawie listy węzłów', bucket: 'ai', explanation: 'Szkic to dobre zadanie dla AI.' },
          { id: 'i2', text: 'Zatwierdzenie harmonogramu i przydział brygad', bucket: 'czlowiek', explanation: 'Decyzja organizacyjna — człowiek.' },
          { id: 'i3', text: 'Wyszukanie w raportach wzmianek o konkretnym węźle', bucket: 'ai', explanation: 'Wyszukiwanie i zestawianie — AI.' },
          { id: 'i4', text: 'Ocena, czy stan techniczny węzła pozwala na dalszą pracę', bucket: 'czlowiek', explanation: 'Ocena bezpieczeństwa — kompetentny człowiek.' },
          { id: 'i5', text: 'Zredagowanie notatki z ustaleń spotkania', bucket: 'ai', explanation: 'Redakcja tekstu — AI.' },
          { id: 'i6', text: 'Akceptacja odpowiedzi na reklamację przed wysłaniem', bucket: 'czlowiek', explanation: 'Odpowiedzialność za korespondencję — człowiek.' },
        ],
        skill: 'struktura',
        criticalBucket: 'czlowiek',
      },
    },
  ],
};

export const ASSESSMENTS: Record<LevelId, AssessmentDef> = {
  poczatkujacy: BEGINNER,
  sredni: INTERMEDIATE,
  zaawansowany: ADVANCED,
};
