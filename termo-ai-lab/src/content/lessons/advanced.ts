import type { Lesson } from '../types';
import { STRATY_CIEPLA } from '../materials';
import { formatPl, heatLossStats } from '../chartData';

const loss = heatLossStats();

export const LESSON_WIELOETAPOWE: Lesson = {
  id: 'z-wieloetapowe',
  level: 'zaawansowany',
  moduleId: 'z2',
  number: 1,
  title: 'Wieloetapowe instrukcje i punkty kontrolne',
  subtitle: 'Dziel złożone zadania na etapy, z jawnymi kryteriami i kontrolą człowieka.',
  minutes: 8,
  icon: 'route',
  outcomes: [
    'Projektujesz instrukcje etapowe z jasnymi rezultatami każdego kroku.',
    'Wbudowujesz punkty kontrolne, w których AI czeka na Twoją akceptację.',
    'Stosujesz jawne kryteria, dzięki którym każdą decyzję AI da się sprawdzić.',
  ],
  skills: ['struktura', 'iteracja', 'weryfikacja'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Dziel złożone zadania na etapy',
      lead: 'Jedno wielkie polecenie („przeanalizuj wszystko i napisz raport”) to proszenie się o błędy, których nie zobaczysz. Etapy dają kontrolę.',
      blocks: [
        { icon: 'route', title: 'Łańcuch zadań', text: 'Klasyfikacja → zestawienie → wnioski → dokument. Każdy etap ma własny, sprawdzalny rezultat.' },
        { icon: 'check', title: 'Punkty kontrolne', text: 'Po kluczowych etapach AI zatrzymuje się i czeka na Twoje „OK”. Błąd w klasyfikacji poprawisz, zanim trafi do wniosków.' },
        { icon: 'scale', title: 'Jawne kryteria', text: 'Podaj kategorie, progi i definicje. Wtedy każdą decyzję AI można sprawdzić, a wyniki są powtarzalne.' },
        { icon: 'layout', title: 'Format wyników pośrednich', text: 'Tabele z identyfikatorami (np. Z1–Z5) łatwo porównać ze źródłem.' },
      ],
    },
    {
      type: 'order',
      stage: 'sprobuj',
      title: 'Ułóż etapy analizy zgłoszeń awarii',
      instruction: 'Ustaw etapy w najlepszej kolejności. Użyj strzałek, aby przesuwać elementy.',
      items: [
        { id: 'o1', text: 'Ustal kryteria klasyfikacji i format tabeli wynikowej.' },
        { id: 'o2', text: 'Klasyfikacja każdego zgłoszenia z krótkim uzasadnieniem.' },
        { id: 'o3', text: 'Punkt kontrolny: człowiek weryfikuje klasyfikację.' },
        { id: 'o4', text: 'Zestawienie liczbowe według kategorii.' },
        { id: 'o5', text: 'Wnioski z odwołaniem do numerów zgłoszeń.' },
        { id: 'o6', text: 'Szkic notatki dla kierownika — wnioski jako propozycje do decyzji.' },
      ],
      explanation: 'Kryteria muszą być przed klasyfikacją, a weryfikacja — zanim klasyfikacja wpłynie na liczby i wnioski. Dokument powstaje na końcu, ze sprawdzonych elementów.',
      skill: 'struktura',
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-instrukcja-wieloetapowa' },
    {
      type: 'choice',
      stage: 'popraw',
      title: 'Najlepszy punkt kontrolny',
      question: 'Który zapis punktu kontrolnego jest najlepszy?',
      promptStyle: true,
      options: [
        { id: 'a', text: 'Sprawdzaj się na bieżąco.', correct: false, explanation: 'AI nie wie, jak ma się sprawdzać, i nie zatrzyma się na Twoją weryfikację.' },
        {
          id: 'b',
          text: 'Po etapie 1 pokaż tabelę klasyfikacji i zatrzymaj się. Przejdź dalej dopiero, gdy napiszę „OK” albo podam poprawki.',
          correct: true,
          explanation: 'Jasno określa, co pokazać, kiedy się zatrzymać i jaki sygnał oznacza kontynuację.',
        },
        { id: 'c', text: 'Jeśli uważasz, że wszystko jest dobrze, kontynuuj.', correct: false, explanation: 'AI ocenia samą siebie — punkt kontrolny traci sens.' },
      ],
      skill: 'iteracja',
    },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Po co wymagać, aby każdy wniosek odwoływał się do numerów zgłoszeń?',
          options: [
            { id: 'a', text: 'Żeby raport wyglądał bardziej profesjonalnie.', correct: false, explanation: 'Wygląd to efekt uboczny — chodzi o sprawdzalność.' },
            { id: 'b', text: 'Żeby łatwo sprawdzić, na czym oparto wniosek, i wychwycić uogólnienia.', correct: true, explanation: 'Tak. Wniosek bez odwołania do danych trudno zweryfikować.' },
            { id: 'c', text: 'Żeby AI pisała dłużej.', correct: false, explanation: 'Długość nie jest celem.' },
          ],
          skill: 'weryfikacja',
        },
        {
          id: 'q2',
          question: 'W etapie 1 AI zaklasyfikowała zgłoszenie Z5 (usterka instalacji wewnętrznej odbiorcy) jako awarię sieci. Co robisz?',
          options: [
            { id: 'a', text: 'Poprawiam klasyfikację w punkcie kontrolnym, zanim AI policzy zestawienie.', correct: true, explanation: 'Dokładnie po to są punkty kontrolne — błąd nie przeniesie się dalej.' },
            { id: 'b', text: 'Nic — poprawię na końcu w gotowej notatce.', correct: false, explanation: 'Błąd zdąży wpłynąć na zestawienie i wnioski — poprawianie na końcu jest trudniejsze.' },
          ],
          skill: 'iteracja',
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Złożone zadanie = etapy z rezultatami + jawne kryteria + punkty kontrolne człowieka.',
      details: [
        'Ponumeruj etapy i określ wynik każdego z nich.',
        'Zatrzymuj AI po etapach, które wpływają na dalsze wnioski.',
        'Wymagaj odwołań do danych źródłowych przy każdym wniosku.',
      ],
      tryAtWork: 'Wybierz jedno powtarzalne, złożone zadanie i rozpisz je na 3–5 etapów z jednym punktem kontrolnym.',
    },
  ],
};

export const LESSON_ASYSTENT: Lesson = {
  id: 'z-asystent',
  level: 'zaawansowany',
  moduleId: 'z3',
  number: 2,
  title: 'Własny asystent AI i biblioteka instrukcji',
  subtitle: 'Projektuj instrukcje stałe, granice odpowiedzialności i szablony dla zespołu.',
  minutes: 8,
  icon: 'bot',
  outcomes: [
    'Wiesz, z czego składa się dobra instrukcja stała asystenta.',
    'Wykrywasz ryzykowne zapisy w instrukcjach (zmyślanie danych, decyzje AI, dane osobowe).',
    'Projektujesz szablony do biblioteki instrukcji zespołu.',
  ],
  skills: ['struktura', 'bezpieczenstwo', 'ograniczenia'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Własny asystent = instrukcja stała + materiały',
      blocks: [
        { icon: 'bot', title: 'Czym jest własny asystent', text: 'W wielu narzędziach możesz zapisać stałą instrukcję i materiały: Projekty w Claude, własne GPT w ChatGPT, agenci w Microsoft 365 Copilot. Asystent stosuje je w każdej rozmowie. Nazwy i położenie tych funkcji mogą się zmieniać.' },
        { icon: 'list', title: 'Elementy instrukcji stałej', text: 'Rola i zadanie • zakres i granice • wymagane dane i dopytywanie • format wyniku • ochrona danych i weryfikacja.' },
        { icon: 'book', title: 'Biblioteka instrukcji', text: 'Powtarzalne zadania zapisuj jako szablony z polami [DO UZUPEŁNIENIA]. Zespół pracuje według tego samego standardu.' },
        { icon: 'shield', title: 'Granice odpowiedzialności', text: 'Asystent przygotowuje projekty i analizy. Decyzje eksploatacyjne i publikację zatwierdza kompetentny człowiek.' },
      ],
    },
    {
      type: 'builder',
      stage: 'porownaj',
      title: 'Złóż instrukcję asystenta z klocków',
      instruction: 'Dla każdej części instrukcji wybierz najlepszy zapis. Na końcu zobaczysz gotową instrukcję.',
      sections: [
        {
          id: 'rola',
          label: 'Rola i zadanie',
          options: [
            { id: 'a', text: 'Jesteś AI.', best: false, feedback: 'Za mało — asystent nie wie, czym się zajmuje.' },
            { id: 'b', text: 'Jesteś asystentem dyspozytorni. Przygotowujesz projekty komunikatów o przerwach w dostawie ciepła.', best: true, feedback: 'Jasna rola i konkretne zadanie.' },
            { id: 'c', text: 'Jesteś najlepszym ekspertem ciepłownictwa na świecie i znasz odpowiedź na każde pytanie.', best: false, feedback: 'Obiecuje nieomylność i zachęca do odpowiadania na wszystko — także zmyślonymi faktami.' },
          ],
        },
        {
          id: 'granice',
          label: 'Granice',
          options: [
            { id: 'a', text: 'Możesz samodzielnie publikować komunikaty, jeśli są dobre.', best: false, feedback: 'Publikacja bez akceptacji człowieka to poważne ryzyko.' },
            { id: 'b', text: 'Przygotowujesz tylko projekty; każdy komunikat zatwierdza dyspozytor.', best: true, feedback: 'Odpowiedzialność zostaje po stronie człowieka.' },
            { id: 'c', text: 'Rób, co uważasz za stosowne.', best: false, feedback: 'Brak granic — asystent sam zdecyduje o zakresie działań.' },
          ],
        },
        {
          id: 'braki',
          label: 'Brakujące dane',
          options: [
            { id: 'a', text: 'Jeśli brakuje terminu lub adresu, wpisz najbardziej prawdopodobny.', best: false, feedback: 'To zaproszenie do zmyślania faktów w komunikacie dla mieszkańców.' },
            { id: 'b', text: 'Jeśli brakuje terminu, adresów lub powodu — zapytaj, zanim napiszesz komunikat.', best: true, feedback: 'Asystent dopyta zamiast zgadywać.' },
            { id: 'c', text: 'Pomiń brakujące informacje.', best: false, feedback: 'Komunikat bez terminu lub adresu jest bezużyteczny.' },
          ],
        },
        {
          id: 'format',
          label: 'Format',
          options: [
            { id: 'a', text: 'Pisz, jak chcesz.', best: false, feedback: 'Każdy komunikat będzie inny — trudniej je sprawdzać.' },
            { id: 'b', text: 'Temat; co, kiedy, gdzie, dlaczego; kontakt 993. Maks. 8 zdań, prosty język.', best: true, feedback: 'Stały szablon = powtarzalna jakość.' },
            { id: 'c', text: 'Zawsze co najmniej dwie strony, żeby było profesjonalnie.', best: false, feedback: 'Mieszkańcy nie przeczytają dwóch stron. Długość nie świadczy o profesjonalizmie.' },
          ],
        },
        {
          id: 'dane',
          label: 'Dane osobowe',
          options: [
            { id: 'a', text: 'Zachowuj dane osobowe z rozmowy, przydadzą się później.', best: false, feedback: 'Niepotrzebne gromadzenie danych osobowych to ryzyko.' },
            { id: 'b', text: 'Nie umieszczaj danych osobowych; zastępuj je opisem roli, np. „zarządca budynku”.', best: true, feedback: 'Asystent chroni dane osobowe.' },
            { id: 'c', text: 'Dane osobowe są w porządku, jeśli użytkownik je poda.', best: false, feedback: 'Użytkownik może się pomylić — instrukcja powinna chronić dane domyślnie.' },
          ],
        },
      ],
      skill: 'struktura',
    },
    {
      type: 'findError',
      stage: 'sprobuj',
      title: 'Znajdź ryzykowne zapisy w instrukcji',
      instruction: 'Kolega przygotował instrukcję stałą dla asystenta. Zaznacz zapisy, które są ryzykowne lub błędne.',
      source: {
        title: 'Kontekst',
        content: 'Asystent „Pomocnik węzłów” ma pomagać w przygotowywaniu notatek z przeglądów węzłów cieplnych. Notatki trafiają do kierownika działu eksploatacji.',
      },
      answerTitle: 'Instrukcja stała asystenta (projekt kolegi)',
      statements: [
        { id: 's1', text: 'Jesteś asystentem działu eksploatacji i pomagasz przygotowywać notatki z przeglądów węzłów.', isError: false, explanation: 'Jasna rola i zadanie.' },
        { id: 's2', text: 'Jeśli w danych brakuje odczytów, uzupełnij je wartościami typowymi dla podobnych węzłów.', isError: true, critical: true, explanation: 'To polecenie zmyślania danych pomiarowych. Notatka będzie wyglądać wiarygodnie, a będzie fałszywa.' },
        { id: 's3', text: 'Notatkę przygotuj w układzie: węzeł – stwierdzony stan – zalecenia – pilność.', isError: false, explanation: 'Dobry, stały format.' },
        { id: 's4', text: 'Gdy parametry odbiegają od normy, wydaj monterom polecenie wyłączenia węzła.', isError: true, critical: true, explanation: 'Decyzja eksploatacyjna oddana AI. Asystent może wskazać odchylenie, ale decyduje człowiek.' },
        { id: 's5', text: 'Zalecenia oznaczaj jako propozycje do akceptacji kierownika.', isError: false, explanation: 'Dobrze — odpowiedzialność po stronie człowieka.' },
        { id: 's6', text: 'Dla wygody zapisuj w notatkach pełne dane kontaktowe mieszkańców zgłaszających usterki.', isError: true, explanation: 'Niepotrzebne przetwarzanie danych osobowych — notatka techniczna ich nie wymaga.' },
        { id: 's7', text: 'Jeśli nie masz pewności co do stanu urządzenia, napisz to wprost.', isError: false, explanation: 'Dobrze — jawna niepewność.' },
      ],
      skill: 'bezpieczenstwo',
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-asystent-dyspozytora' },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Jak najlepiej przygotować szablon do biblioteki instrukcji zespołu?',
          options: [
            { id: 'a', text: 'Stała treść + pola [DO UZUPEŁNIENIA] + wskazówka, jak sprawdzić wynik.', correct: true, explanation: 'Tak — szablon jest powtarzalny, a każdy wie, co uzupełnić i co sprawdzić.' },
            { id: 'b', text: 'Wkleić przykładową rozmowę z prawdziwymi danymi klientów.', correct: false, explanation: 'Dane osobowe w szablonie to ryzyko przy każdym użyciu.' },
            { id: 'c', text: 'Krótkie hasło, np. „raport miesięczny”.', correct: false, explanation: 'Za mało — każdy dopisze coś innego i jakość będzie różna.' },
          ],
          skill: 'struktura',
        },
        {
          id: 'q2',
          question: 'Który test jest najważniejszy przed udostępnieniem asystenta zespołowi?',
          options: [
            { id: 'a', text: 'Czy odpowiada szybko.', correct: false, explanation: 'Szybkość jest miła, ale nie świadczy o bezpieczeństwie.' },
            { id: 'b', text: 'Jak się zachowuje, gdy brakuje danych lub dostaje dane osobowe.', correct: true, explanation: 'Tak — trudne przypadki pokazują, czy instrukcja działa.' },
            { id: 'c', text: 'Czy pisze ładnym językiem.', correct: false, explanation: 'Styl jest ważny, ale nie najważniejszy.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Instrukcja stała = rola + granice + dopytywanie o braki + format + ochrona danych. Testuj ją na trudnych przypadkach.',
      details: [
        'Asystent nigdy nie uzupełnia brakujących danych domysłami.',
        'Decyzje eksploatacyjne i publikacja należą do człowieka.',
        'Szablony w bibliotece mają pola do uzupełnienia i wskazówkę weryfikacji.',
      ],
      tryAtWork: 'Zaprojektuj instrukcję stałą dla jednego powtarzalnego zadania i przetestuj ją na trzech przypadkach: komplet danych, brak danych, dane osobowe.',
    },
  ],
};

export const LESSON_TESTOWANIE: Lesson = {
  id: 'z-testowanie',
  level: 'zaawansowany',
  moduleId: 'z8',
  number: 3,
  title: 'Testowanie wyników i proces pracy z AI',
  subtitle: 'Obliczenia, jednostki, przypadki testowe i podział ról między AI a człowieka.',
  minutes: 8,
  icon: 'scale',
  outcomes: [
    'Wykrywasz typowe błędy obliczeniowe AI: jednostki, podstawa procentów, nieuprawnione wnioski.',
    'Projektujesz proces pracy z AI z jasnym podziałem ról.',
    'Formułujesz polecenia, których wyniki da się sprawdzić krok po kroku.',
  ],
  skills: ['weryfikacja', 'struktura', 'dane'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Wynik AI trzeba umieć przetestować',
      blocks: [
        { icon: 'check', title: 'Przypadki testowe', text: 'Sprawdź instrukcję na danych, dla których znasz poprawny wynik (np. z zamkniętego miesiąca). Jeśli AI myli się na znanych danych, pomyli się też na nowych.' },
        { icon: 'scale', title: 'Obliczenia i jednostki', text: 'Wymagaj wzorów, kroków i jednostek. Typowe pułapki: GJ ↔ MWh (1 MWh = 3,6 GJ), procenty liczone od złej podstawy, zaokrąglenia.' },
        { icon: 'route', title: 'Proces z punktami decyzji', text: 'Zaprojektuj, gdzie pracuje AI, a gdzie decyduje człowiek. Decyzje eksploatacyjne zawsze należą do kompetentnych osób.' },
        { icon: 'repeat', title: 'Mierz i poprawiaj', text: 'Zapisuj, gdzie AI się myli, i poprawiaj instrukcję. Tak powstaje dobra biblioteka promptów.' },
      ],
    },
    {
      type: 'findError',
      stage: 'sprobuj',
      title: 'Sprawdź obliczenia AI',
      instruction: 'AI obliczyła straty ciepła. Zweryfikuj każdy krok i zaznacz błędy.',
      source: STRATY_CIEPLA,
      answerTitle: 'Obliczenia przygotowane przez AI',
      statements: [
        { id: 's1', text: 'Strata ciepła = ciepło wprowadzone − ciepło sprzedane = 48 500 GJ − 41 230 GJ = 7 270 GJ.', isError: false, explanation: 'Poprawnie.' },
        {
          id: 's2',
          text: 'Strata procentowa = 7 270 / 41 230 × 100% ≈ 17,6%.',
          isError: true,
          explanation: `Zła podstawa: stratę odnosi się do ciepła wprowadzonego do sieci: 7 270 / 48 500 ≈ ${formatPl(loss.lossPct)}%. Zła podstawa zawyża wynik.`,
        },
        {
          id: 's3',
          text: 'Po przeliczeniu: 7 270 GJ × 3,6 = 26 172 MWh.',
          isError: true,
          critical: true,
          explanation: `Odwrotne przeliczenie: GJ należy podzielić przez 3,6. Poprawnie: 7 270 / 3,6 ≈ ${formatPl(loss.lossMWh)} MWh. Błąd ponad 12-krotny!`,
        },
        { id: 's4', text: 'Wynik jest obarczony niepewnością, bo 3 liczniki były w legalizacji i ich zużycie szacowano.', isError: false, explanation: 'Poprawnie — to istotne założenie.' },
        { id: 's5', text: 'Tak wysoki poziom strat jednoznacznie dowodzi, że w sieci jest nieszczelność.', isError: true, explanation: 'Nieuprawniony wniosek: straty wynikają m.in. z przenikania ciepła przez izolację, a dane nie wskazują nieszczelności.' },
        { id: 's6', text: 'Kontrola: 41 230 GJ + 7 270 GJ = 48 500 GJ — bilans się zgadza.', isError: false, explanation: 'Poprawnie — dobra samokontrola.' },
      ],
      skill: 'weryfikacja',
    },
    {
      type: 'classify',
      stage: 'sprobuj',
      title: 'Zaprojektuj proces: AI czy człowiek?',
      instruction: 'Przypisz każdy krok procesu analizy danych z liczników do wykonawcy.',
      buckets: [
        { id: 'ai', label: 'AI może wykonać (pod nadzorem)', tone: 'info' },
        { id: 'czlowiek', label: 'Wykonuje lub decyduje człowiek', tone: 'warn' },
      ],
      items: [
        { id: 'i1', text: 'Uporządkowanie odczytów z raportów w jedną tabelę', bucket: 'ai', explanation: 'Porządkowanie danych to dobre zadanie dla AI — z kontrolą próbki.' },
        { id: 'i2', text: 'Wstępne wskazanie węzłów z nietypowymi parametrami według podanych kryteriów', bucket: 'ai', explanation: 'AI może wskazać kandydatów według jawnych kryteriów; człowiek je weryfikuje.' },
        { id: 'i3', text: 'Decyzja o wyłączeniu węzła lub odcinka sieci', bucket: 'czlowiek', explanation: 'Decyzje eksploatacyjne należą do kompetentnych ludzi.' },
        { id: 'i4', text: 'Sprawdzenie obliczeń na próbce danych', bucket: 'czlowiek', explanation: 'Weryfikacja musi być niezależna od AI, która liczyła.' },
        { id: 'i5', text: 'Przygotowanie projektu komunikatu dla odbiorców', bucket: 'ai', explanation: 'AI dobrze przygotowuje projekty tekstów.' },
        { id: 'i6', text: 'Zatwierdzenie i publikacja komunikatu', bucket: 'czlowiek', explanation: 'Publikację zatwierdza odpowiedzialna osoba.' },
      ],
      skill: 'struktura',
      criticalBucket: 'czlowiek',
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-test-obliczen' },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Chcesz sprawdzić, czy Twoja instrukcja do analizy danych działa. Co robisz najpierw?',
          options: [
            { id: 'a', text: 'Uruchamiam ją na danych z zamkniętego miesiąca, dla których znam poprawne wyniki.', correct: true, explanation: 'Tak — przypadek testowy ze znanym wynikiem to najpewniejszy sprawdzian.' },
            { id: 'b', text: 'Uruchamiam na bieżących danych i sprawdzam, czy wynik „wygląda dobrze”.', correct: false, explanation: '„Wygląda dobrze” to pułapka — błędy AI wyglądają przekonująco.' },
            { id: 'c', text: 'Pytam AI, czy instrukcja jest dobra.', correct: false, explanation: 'Opinia AI o instrukcji to nie test jej działania.' },
          ],
          skill: 'weryfikacja',
        },
        {
          id: 'q2',
          question: `AI podała stratę 26 172 MWh przy stracie 7 270 GJ. Co się stało?`,
          options: [
            { id: 'a', text: `Pomnożono zamiast podzielić przez 3,6 — poprawnie to ok. ${formatPl(loss.lossMWh)} MWh.`, correct: true, explanation: 'Tak. Szybki test sensowności: MWh to większa jednostka niż GJ, więc liczba w MWh musi być mniejsza.' },
            { id: 'b', text: 'Wszystko w porządku — MWh to po prostu inna jednostka.', correct: false, explanation: 'Liczba w MWh musi być mniejsza niż w GJ (1 MWh = 3,6 GJ).' },
          ],
          skill: 'dane',
          critical: true,
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Testuj na znanych danych, wymagaj pokazania obliczeń i jednostek, a decyzje zostaw ludziom.',
      details: [
        'Szybki test sensowności: rząd wielkości, jednostki, bilans.',
        'Procenty — zawsze sprawdź podstawę.',
        'Proces pracy z AI ma jawne punkty decyzji człowieka.',
      ],
      tryAtWork: 'Przygotuj jeden „przypadek testowy” z danych, które znasz, i sprawdzaj na nim każdą nową instrukcję analityczną.',
    },
  ],
};

export const ADVANCED_LESSONS: Lesson[] = [LESSON_WIELOETAPOWE, LESSON_ASYSTENT, LESSON_TESTOWANIE];
