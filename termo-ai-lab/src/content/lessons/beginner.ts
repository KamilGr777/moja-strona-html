import type { Lesson } from '../types';
import { AWARIA_KWIATOWA } from '../materials';

export const LESSON_PIERWSZE_KROKI: Lesson = {
  id: 'p-pierwsze-kroki',
  level: 'poczatkujacy',
  moduleId: 'p1',
  number: 1,
  title: 'Pierwsze kroki z AI',
  subtitle: 'W czym AI pomaga, czego nie robi niezawodnie i jak wygląda rozmowa.',
  minutes: 6,
  icon: 'sparkles',
  outcomes: [
    'Wiesz, w jakich zadaniach AI realnie pomaga, a kiedy trzeba uważać.',
    'Wiesz, jak zacząć rozmowę w ChatGPT, Claude lub Microsoft Copilot.',
    'Potrafisz poprawiać odpowiedź AI w tej samej rozmowie.',
  ],
  skills: ['iteracja', 'weryfikacja'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Czym jest asystent AI?',
      lead: 'Asystent AI — np. ChatGPT, Claude czy Microsoft Copilot — to program, z którym rozmawiasz, pisząc zwykłe zdania. Rozumie polecenia i tworzy teksty, zestawienia i podsumowania.',
      blocks: [
        { icon: 'message', title: 'Rozmawiasz jak z człowiekiem', text: 'Piszesz po polsku, pełnymi zdaniami. Nie musisz znać żadnych komend ani języka programowania.' },
        { icon: 'sparkles', title: 'W czym pomaga', text: 'Pisanie i poprawianie tekstów, streszczanie długich dokumentów, porządkowanie notatek, tworzenie tabel, wyjaśnianie trudnych pojęć, szukanie pomysłów.' },
        { icon: 'alert', title: 'Czego nie robi niezawodnie', text: 'Może się pomylić — także bardzo pewnym tonem. Nie zna danych Twojej firmy ani stanu Twojej sieci, jeśli mu ich nie podasz. Liczby i przepisy zawsze sprawdzaj.' },
        { icon: 'shield', title: 'Decydujesz Ty', text: 'AI przygotowuje propozycje. Za decyzje i za tekst, który wysyłasz, odpowiadasz Ty.' },
      ],
      callout: {
        tone: 'heat',
        text: 'Twoje doświadczenie zawodowe jest tu kluczowe: to Ty wiesz, co jest prawdą w Twojej sieci. AI pomaga szybciej to zapisać, uporządkować i przekazać.',
      },
    },
    {
      type: 'classify',
      stage: 'sprobuj',
      title: 'Pomoże czy trzeba uważać?',
      instruction: 'Przypisz każde zadanie do jednej z grup. Kliknij zadanie, a potem wybierz grupę.',
      buckets: [
        { id: 'ok', label: 'AI dobrze w tym pomoże', tone: 'ok' },
        { id: 'warn', label: 'Uwaga: wymaga sprawdzenia lub decyzji człowieka', tone: 'warn' },
      ],
      items: [
        { id: 'i1', text: 'Zredagowanie uprzejmego e-maila do zarządcy budynku', bucket: 'ok', explanation: 'Redagowanie tekstów to mocna strona AI. Ty sprawdzasz tylko fakty: daty, adresy, numery.' },
        { id: 'i2', text: 'Decyzja, czy wyłączyć odcinek sieci podczas awarii', bucket: 'warn', explanation: 'Decyzje eksploatacyjne podejmuje kompetentny człowiek. AI może najwyżej pomóc uporządkować informacje.' },
        { id: 'i3', text: 'Streszczenie 20-stronicowej instrukcji obsługi węzła', bucket: 'ok', explanation: 'AI szybko streszcza długie dokumenty. Najważniejsze fragmenty (np. BHP) i tak sprawdź w oryginale.' },
        { id: 'i4', text: 'Podanie liczby awarii w Twojej sieci w zeszłym roku', bucket: 'warn', explanation: 'AI nie ma dostępu do Twoich systemów. Jeśli poda liczbę, może ją po prostu zmyślić.' },
        { id: 'i5', text: 'Zamiana notatek z obchodu na czytelną listę zadań', bucket: 'ok', explanation: 'Porządkowanie notatek to świetne zastosowanie — byle AI nie dopisywała niczego od siebie.' },
        { id: 'i6', text: 'Obliczenie strat ciepła do raportu dla zarządu', bucket: 'warn', explanation: 'AI może pomóc, ale obliczenia trzeba sprawdzić — szczególnie jednostki i podstawę procentów.' },
      ],
      skill: 'weryfikacja',
    },
    {
      type: 'tools',
      stage: 'zobacz',
      title: 'Jak zacząć: trzy popularne asystenty',
      lead: 'Wybierz narzędzie, z którego korzystasz (lub które jest dopuszczone w Twojej firmie), i zobacz, jak rozpocząć pierwszą rozmowę.',
    },
    {
      type: 'chat',
      stage: 'sprobuj',
      title: 'Rozmowa z AI krok po kroku',
      instruction: 'To symulacja rozmowy — odpowiedzi AI zostały przygotowane wcześniej. Wybieraj kolejne wiadomości i zobacz, jak dopytywanie poprawia wynik.',
      firstMessage: 'Napisz przypomnienie o szkoleniu BHP.',
      start: 'n1',
      nodes: {
        n1: {
          ai: 'Oczywiście! Oto przypomnienie:\n\n„Szanowni Państwo, przypominamy o zbliżającym się szkoleniu BHP. Prosimy o obecność.”\n\nCzy chcesz coś dodać?',
          choices: [
            {
              text: 'Dodaj, że szkolenie jest w czwartek 26 listopada o 9:00 w sali nr 2 i trwa ok. 2 godzin. Pisz do zespołu monterów, na „Wy”.',
              next: 'n2',
              good: true,
              feedback: 'Świetnie! Podajesz fakty, których AI nie znała, i wskazujesz odbiorcę.',
            },
            {
              text: 'Napisz to lepiej.',
              next: 'n1b',
              good: false,
              feedback: 'AI nie wie, co znaczy „lepiej”. Zwykle dopisze tylko ozdobniki. Lepiej powiedzieć konkretnie, czego brakuje.',
            },
          ],
        },
        n1b: {
          ai: 'Oto ulepszona wersja:\n\n„Szanowni Państwo, uprzejmie przypominamy o zbliżającym się, niezwykle ważnym szkoleniu z zakresu bezpieczeństwa i higieny pracy. Państwa obecność jest dla nas bardzo istotna.”',
          choices: [
            {
              text: 'Dodaj, że szkolenie jest w czwartek 26 listopada o 9:00 w sali nr 2 i trwa ok. 2 godzin. Pisz do zespołu monterów, na „Wy”.',
              next: 'n2',
              good: true,
              feedback: 'Właśnie tak — konkret zamiast „lepiej”.',
            },
          ],
        },
        n2: {
          ai: '„Cześć! Przypominamy: w czwartek 26 listopada o 9:00 w sali nr 2 odbędzie się szkolenie BHP (ok. 2 godziny). Obecność obowiązkowa.”',
          choices: [
            {
              text: 'Usuń zdanie o obowiązkowej obecności — tego nie podałem. Dodaj prośbę o zabranie legitymacji służbowej.',
              next: 'n3',
              good: true,
              feedback: 'Doskonale! Zauważyłeś, że AI dopisała informację, której nie podałeś. To bardzo ważna umiejętność.',
            },
            {
              text: 'Super, wysyłam.',
              next: 'n2b',
              good: false,
              feedback: 'Uwaga: AI dopisała „Obecność obowiązkowa”, a tego nie było w Twoich danych. Zawsze czytaj odpowiedź przed wysłaniem.',
            },
          ],
        },
        n2b: {
          ai: '(Wiadomość nie została jeszcze wysłana — możesz ją poprawić.)',
          choices: [
            {
              text: 'Usuń zdanie o obowiązkowej obecności — tego nie podałem. Dodaj prośbę o zabranie legitymacji służbowej.',
              next: 'n3',
              good: true,
              feedback: 'Dobrze — poprawka w tej samej rozmowie zajmuje kilka sekund.',
            },
          ],
        },
        n3: {
          ai: '„Cześć! W czwartek 26 listopada o 9:00 w sali nr 2 odbędzie się szkolenie BHP (ok. 2 godziny). Prosimy o zabranie legitymacji służbowej.”',
          end: true,
        },
      },
      outro: 'Tak wygląda dobra rozmowa z AI: nie zaczynasz od nowa, tylko doprecyzowujesz. Każda kolejna wiadomość poprawia wynik — a Ty pilnujesz faktów.',
      skill: 'iteracja',
    },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'AI podała pewnym tonem liczbę awarii w Twojej sieci w zeszłym roku. Co robisz?',
          options: [
            { id: 'a', text: 'Wpisuję liczbę do raportu — brzmi wiarygodnie.', correct: false, explanation: 'Pewny ton nie oznacza prawdy. AI nie ma dostępu do Twoich systemów.' },
            { id: 'b', text: 'Sprawdzam liczbę w naszym systemie — AI nie zna naszych danych.', correct: true, explanation: 'Dokładnie tak. Liczby o Twojej sieci pochodzą z Twoich systemów, nie z AI.' },
            { id: 'c', text: 'Pytam AI, czy jest pewna. Jeśli potwierdzi — wpisuję.', correct: false, explanation: 'AI może potwierdzić własny błąd. Weryfikacja musi pochodzić ze źródła danych.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
        {
          id: 'q2',
          question: 'Odpowiedź AI jest prawie dobra, ale za długa. Jaki jest najlepszy następny krok?',
          options: [
            { id: 'a', text: 'Zamykam rozmowę i zaczynam nową z tym samym poleceniem.', correct: false, explanation: 'Stracisz to, co już działało. Lepiej doprecyzować w tej samej rozmowie.' },
            { id: 'b', text: 'Piszę w tej samej rozmowie: „Skróć do 5 zdań i usuń powtórzenia”.', correct: true, explanation: 'Tak! Konkretna poprawka w tej samej rozmowie to najszybsza droga do dobrego wyniku.' },
            { id: 'c', text: 'Skracam ręcznie — AI i tak tego nie zrozumie.', correct: false, explanation: 'Możesz, ale AI zrobi to szybciej. Wystarczy powiedzieć, czego oczekujesz.' },
          ],
          skill: 'iteracja',
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'AI to szybki pomocnik do tekstów i porządkowania informacji — ale fakty, liczby i decyzje sprawdzasz Ty.',
      details: [
        'Pisz zwykłymi zdaniami — nie potrzebujesz komend.',
        'Jeśli wynik nie jest idealny, dopytaj w tej samej rozmowie.',
        'Nie podawaj danych osobowych ani poufnych informacji firmy.',
      ],
      tryAtWork: 'Otwórz asystenta AI dopuszczonego w Twojej firmie i poproś go o przeredagowanie jednego e-maila, który dziś piszesz.',
    },
  ],
};

export const LESSON_PIERWSZE_POLECENIE: Lesson = {
  id: 'p-pierwsze-polecenie',
  level: 'poczatkujacy',
  moduleId: 'p2',
  number: 2,
  title: 'Twoje pierwsze polecenie (prompt)',
  subtitle: 'Cel, kontekst, dane i oczekiwany wynik — cztery elementy dobrego polecenia.',
  minutes: 7,
  icon: 'target',
  outcomes: [
    'Wiesz, czym jest prompt — polecenie lub instrukcja dla AI.',
    'Potrafisz zbudować polecenie z czterech elementów: cel, kontekst, dane, wynik.',
    'Rozumiesz, dlaczego jedne prompty działają lepiej od innych.',
  ],
  skills: ['cel', 'kontekst', 'dane', 'format'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Prompt, czyli polecenie dla AI',
      lead: 'Prompt (czyt. „prompt”) to polecenie lub instrukcja, którą wpisujesz do AI. Od jego jakości zależy jakość odpowiedzi. Dobry prompt ma zwykle cztery elementy:',
      blocks: [
        { icon: 'target', title: '1. Cel', text: 'Co ma powstać? Np. „Napisz e-mail…”, „Przygotuj tabelę…”, „Streść…”.' },
        { icon: 'users', title: '2. Kontekst', text: 'Sytuacja i odbiorca. Np. „dla zarządcy budynku, który przekaże informację mieszkańcom”.' },
        { icon: 'database', title: '3. Dane', text: 'Fakty, których AI nie zna: terminy, adresy, liczby. AI ich nie zgadnie — pominie je albo zmyśli.' },
        { icon: 'layout', title: '4. Oczekiwany wynik', text: 'Forma, długość i ton. Np. „e-mail z tematem, maks. 6 zdań, uprzejmie”.' },
      ],
      callout: {
        tone: 'info',
        text: 'Nie każde polecenie potrzebuje wszystkich elementów w równym stopniu. Dobieraj je do zadania — ale zawsze zacznij od celu.',
      },
    },
    {
      type: 'compare',
      stage: 'porownaj',
      title: 'Słabe i lepsze polecenie',
      situation: 'Trzeba poinformować zarządcę nieruchomości o planowanej przerwie w dostawie ciepła.',
      weak: {
        prompt: 'Napisz informację o przerwie w ciepłej wodzie.',
        result: '„Szanowni Mieszkańcy, informujemy, że w najbliższym czasie nastąpi przerwa w dostawie ciepłej wody. Za utrudnienia przepraszamy.”',
        problems: [
          'Brak terminu i adresów — AI ich nie zna, więc tekst jest bezużyteczny.',
          'Tekst skierowany do mieszkańców, a miał trafić do zarządcy.',
          'Pominięto ogrzewanie i kontakt w razie problemów.',
        ],
      },
      strong: {
        prompt:
          'Napisz e-mail do zarządcy nieruchomości o planowanej przerwie w dostawie ciepła: wtorek 24 listopada, 8:00–14:00, ul. Słoneczna 2–8, powód: wymiana zaworu odcinającego. Nie będzie ogrzewania ani ciepłej wody. Kontakt: tel. 993. Maks. 6 zdań, uprzejmie i rzeczowo, z tematem wiadomości.',
        result:
          'Temat: Planowana przerwa w dostawie ciepła — ul. Słoneczna 2–8, 24 listopada\n\n„Szanowni Państwo, uprzejmie informujemy, że we wtorek 24 listopada w godz. 8:00–14:00 nastąpi przerwa w dostawie ciepła do budynków przy ul. Słonecznej 2–8. W tym czasie nie będzie ogrzewania ani ciepłej wody. Przerwa jest związana z wymianą zaworu odcinającego. Prosimy o przekazanie tej informacji mieszkańcom. W razie pytań prosimy o kontakt z Pogotowiem ciepłowniczym pod nr 993.”',
        strengths: [
          'Cel i odbiorca są jasne od pierwszego zdania.',
          'Wszystkie fakty są podane — AI niczego nie zgaduje.',
          'Forma, długość i ton sprawiają, że tekst jest gotowy do wysłania.',
        ],
      },
      takeaway: 'AI nie czyta w myślach. Wszystko, czego nie napiszesz, uzupełni ogólnikiem — albo zmyśli.',
    },
    {
      type: 'choice',
      stage: 'porownaj',
      title: 'Który prompt jest lepszy?',
      question: 'Chcesz, aby AI streściła instrukcję obsługi nowego węzła cieplnego dla monterów. Które polecenie jest najlepsze?',
      promptStyle: true,
      options: [
        { id: 'a', text: 'Streść instrukcję.', correct: false, explanation: 'Brak odbiorcy, zakresu i formy — dostaniesz ogólne streszczenie, które trudno wykorzystać.' },
        {
          id: 'b',
          text: 'Streść poniższą instrukcję obsługi węzła dla monterów: wypisz w punktach czynności przy uruchomieniu i zatrzymaniu węzła oraz ostrzeżenia BHP. Maksymalnie jedna strona.',
          correct: true,
          explanation: 'Jest cel, odbiorca, zakres (uruchomienie, zatrzymanie, BHP) i forma. To polecenie da użyteczny wynik.',
        },
        {
          id: 'c',
          text: 'Jesteś najlepszym ekspertem na świecie. Streść instrukcję najlepiej, jak potrafisz, bardzo dokładnie i profesjonalnie.',
          correct: false,
          explanation: 'Dużo słów, mało informacji. Pochwały i „bardzo dokładnie” nie zastąpią odbiorcy, zakresu i formy.',
        },
      ],
      skill: 'format',
    },
    {
      type: 'match',
      stage: 'sprobuj',
      title: 'Rozpoznaj elementy promptu',
      instruction: 'Przypisz każdy fragment polecenia do właściwego elementu.',
      categories: [
        { id: 'cel', label: 'Cel' },
        { id: 'kontekst', label: 'Kontekst' },
        { id: 'dane', label: 'Dane' },
        { id: 'wynik', label: 'Oczekiwany wynik' },
      ],
      items: [
        { id: 'm1', text: 'Napisz komunikat o planowanej przerwie w dostawie ciepła', category: 'cel', explanation: 'To mówi AI, co ma powstać — cel.' },
        { id: 'm2', text: 'dla zarządcy nieruchomości, który przekaże go mieszkańcom', category: 'kontekst', explanation: 'Odbiorca i sytuacja — kontekst.' },
        { id: 'm3', text: 'wtorek 24 listopada, 8:00–14:00, ul. Słoneczna 2–8', category: 'dane', explanation: 'Konkretne fakty — dane.' },
        { id: 'm4', text: 'powód: wymiana zaworu odcinającego', category: 'dane', explanation: 'Kolejny fakt, którego AI nie zna — dane.' },
        { id: 'm5', text: 'e-mail z tematem, maksymalnie 6 zdań', category: 'wynik', explanation: 'Forma i długość — oczekiwany wynik.' },
        { id: 'm6', text: 'ton uprzejmy i rzeczowy', category: 'wynik', explanation: 'Ton też opisuje oczekiwany wynik.' },
      ],
      skill: 'cel',
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-komunikat-zarzadca' },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Co zwykle najbardziej poprawia odpowiedź AI?',
          options: [
            { id: 'a', text: 'Dodanie słowa „proszę”.', correct: false, explanation: 'Uprzejmość nie szkodzi, ale nie daje AI żadnych nowych informacji.' },
            { id: 'b', text: 'Podanie konkretnych faktów i oczekiwanej formy wyniku.', correct: true, explanation: 'Tak — fakty i forma to to, czego AI najbardziej brakuje.' },
            { id: 'c', text: 'Pisanie wielkimi literami, żeby AI potraktowała zadanie poważnie.', correct: false, explanation: 'Wielkie litery nie zmieniają jakości odpowiedzi.' },
          ],
          skill: 'dane',
        },
        {
          id: 'q2',
          question: 'Piszesz polecenie o awarii, ale nie znasz jeszcze godziny przywrócenia dostaw. Co robisz?',
          options: [
            { id: 'a', text: 'Wpisuję przybliżoną godzinę — najwyżej się poprawi.', correct: false, explanation: 'Przybliżona godzina trafi do tekstu jako fakt. Ktoś może na niej polegać.' },
            { id: 'b', text: 'Proszę AI, żeby sama oszacowała godzinę.', correct: false, explanation: 'AI nie zna sytuacji na miejscu — po prostu zgadnie.' },
            { id: 'c', text: 'Piszę: „godzina przywrócenia — zostaw miejsce [GODZINA] do uzupełnienia”.', correct: true, explanation: 'Dokładnie tak. Znacznik pokazuje, czego brakuje, i nikt nie weźmie zgadywania za fakt.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Dobry prompt = cel + kontekst + dane + oczekiwany wynik.',
      details: [
        'Zacznij od celu: co ma powstać.',
        'Podaj fakty, których AI nie zna — inaczej je pominie albo zmyśli.',
        'Określ formę i długość, a dostaniesz tekst gotowy do użycia.',
      ],
      tryAtWork: 'Przy najbliższym e-mailu lub notatce napisz polecenie według schematu: cel, kontekst, dane, wynik — i porównaj z tym, co dostawałeś wcześniej.',
    },
  ],
};

export const LESSON_SPRAWDZANIE: Lesson = {
  id: 'p-sprawdzanie',
  level: 'poczatkujacy',
  moduleId: 'p6',
  number: 3,
  title: 'Sprawdzaj, zanim użyjesz',
  subtitle: 'Jak wychwycić błędy i zmyślenia AI oraz jak chronić dane.',
  minutes: 7,
  icon: 'shield',
  outcomes: [
    'Rozpoznajesz typowe błędy AI: zmyślenia, pominięcia, niepewność podaną jako pewnik.',
    'Potrafisz zanonimizować tekst, zanim wkleisz go do AI.',
    'Umiesz poprosić AI o zaznaczanie niepewnych i brakujących informacji.',
  ],
  skills: ['weryfikacja', 'bezpieczenstwo'],
  steps: [
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Dlaczego AI się myli?',
      lead: 'Model językowy tworzy tekst, który brzmi wiarygodnie. Zwykle ma rację — ale nie zawsze. Najgroźniejsze błędy wyglądają przekonująco.',
      blocks: [
        { icon: 'alert', title: 'Zmyślenia', text: 'AI może podać nieistniejący przepis, liczbę lub fakt. Brzmi pewnie, ale nie ma oparcia w danych. Mówi się na to „halucynacje”.' },
        { icon: 'eye', title: 'Pominięcia i zmiany', text: 'Przy streszczaniu AI może pominąć ważny szczegół albo zmienić liczbę, datę czy adres.' },
        { icon: 'scale', title: 'Niepewność podana jako pewnik', text: '„Wstępnie korozja, do potwierdzenia” potrafi zamienić się w „przyczyną była korozja”.' },
        { icon: 'check', title: 'Jak sprawdzać', text: 'Porównuj z oryginałem: liczby, daty, adresy, nazwy. Pytaj o źródło. Proś AI, by zaznaczała niepewności.' },
      ],
    },
    {
      type: 'findError',
      stage: 'sprobuj',
      title: 'Znajdź błędy AI',
      instruction: 'AI streściła notatkę z awarii. Porównaj streszczenie z notatką i zaznacz zdania, które są błędne lub nieuprawnione.',
      source: AWARIA_KWIATOWA,
      answerTitle: 'Streszczenie przygotowane przez AI',
      statements: [
        { id: 's1', text: 'Wyciek zgłoszono o 6:40 w komorze K-7.', isError: false, explanation: 'Zgadza się z notatką.' },
        { id: 's2', text: 'Bez ogrzewania i ciepłej wody pozostało 8 budynków.', isError: true, explanation: 'W notatce jest 6 budynków (Kwiatowa 10–20, numery parzyste). AI zmieniła liczbę.' },
        { id: 's3', text: 'Przyczyną awarii była korozja zewnętrzna rury.', isError: true, explanation: 'W notatce przyczyna jest wstępna i „do potwierdzenia”. AI podała hipotezę jako fakt.' },
        { id: 's4', text: 'Dostawy przywrócono o 16:10, czyli później niż planowano (15:00).', isError: false, explanation: 'Zgadza się z notatką.' },
        { id: 's5', text: 'Awarię spowodowały wcześniejsze prace firmy zewnętrznej.', isError: true, critical: true, explanation: 'Tego nie ma w notatce — to zmyślenie. Taki zapis mógłby bezpodstawnie obciążyć wykonawcę.' },
        { id: 's6', text: 'Odcinek sieci odcięto o 7:25.', isError: false, explanation: 'Zgadza się z notatką.' },
      ],
      skill: 'weryfikacja',
    },
    {
      type: 'concept',
      stage: 'zobacz',
      title: 'Chroń dane, zanim cokolwiek wkleisz',
      blocks: [
        { icon: 'lock', title: 'Czego nie wklejać', text: 'Danych osobowych (imion, nazwisk, telefonów, adresów, numerów PESEL), haseł, informacji o zabezpieczeniach infrastruktury i poufnych umów.' },
        { icon: 'shield', title: 'Narzędzia zatwierdzone w firmie', text: 'Firmowe wersje asystentów mogą mieć inne zasady przetwarzania danych niż darmowe. Sprawdź, co dopuszcza polityka Twojej firmy.' },
        { icon: 'wrench', title: 'Anonimizuj', text: 'Zastępuj dane znacznikami, np. [ODBIORCA], [ADRES]. AI napisze tekst równie dobrze, a prawdziwe dane uzupełnisz sam.' },
      ],
      callout: { tone: 'warn', text: 'Raz wysłanych danych nie da się „cofnąć” prośbą do AI. Anonimizuj przed wklejeniem.' },
    },
    {
      type: 'redact',
      stage: 'sprobuj',
      title: 'Zanonimizuj zgłoszenie',
      instruction: 'Chcesz, aby AI pomogła odpowiedzieć na to zgłoszenie. Kliknij fragmenty, które trzeba ukryć przed wklejeniem do AI. Kliknij ponownie, aby cofnąć.',
      segments: [
        { text: 'Pani ' },
        { text: 'Anna Kowalska', selectable: true, sensitive: true, category: 'imię i nazwisko', replacement: '[OSOBA]' },
        { text: ' (tel. ' },
        { text: '601 234 567', selectable: true, sensitive: true, category: 'telefon', replacement: '[TELEFON]' },
        { text: ') z ' },
        { text: 'ul. Lipowej 8/12', selectable: true, sensitive: true, category: 'adres z numerem mieszkania', replacement: '[ADRES]' },
        { text: ' zgłosiła ' },
        { text: 'brak ciepłej wody', selectable: true, sensitive: false },
        { text: ' od trzech dni. Numer licznika: ' },
        { text: '45-889-221', selectable: true, sensitive: true, category: 'numer licznika (identyfikuje lokal)', replacement: '[NR LICZNIKA]' },
        { text: '. Problem dotyczy ' },
        { text: 'całego pionu w budynku', selectable: true, sensitive: false },
        { text: '. Prosi o kontakt mailowy: ' },
        { text: 'anna.kowalska@poczta.pl', selectable: true, sensitive: true, category: 'e-mail', replacement: '[E-MAIL]' },
        { text: '.' },
      ],
      afterword: 'AI potrzebuje sensu sprawy (brak ciepłej wody w całym pionie), a nie danych osoby. Dane uzupełnisz już poza narzędziem AI.',
      skill: 'bezpieczenstwo',
    },
    { type: 'trainer', stage: 'sprobuj', taskId: 't-napraw-awaria' },
    {
      type: 'quiz',
      stage: 'zapamietaj',
      title: 'Szybkie sprawdzenie',
      questions: [
        {
          id: 'q1',
          question: 'Skarga mieszkańca zawiera imię, nazwisko i telefon. Chcesz, aby AI pomogła na nią odpowiedzieć. Co robisz?',
          options: [
            { id: 'a', text: 'Wklejam całą skargę — AI lepiej zrozumie sprawę.', correct: false, explanation: 'AI nie potrzebuje danych osobowych, żeby napisać dobrą odpowiedź. Ich przesłanie to niepotrzebne ryzyko.' },
            { id: 'b', text: 'Usuwam dane osobowe i zastępuję je znacznikami, np. [ODBIORCA].', correct: true, explanation: 'Tak. Sens sprawy zostaje, dane osobowe — nie.' },
            { id: 'c', text: 'Wklejam, ale proszę AI, żeby zapomniała dane.', correct: false, explanation: 'Prośba nie cofa wysłania danych. Anonimizuj przed wklejeniem.' },
          ],
          skill: 'bezpieczenstwo',
          critical: true,
        },
        {
          id: 'q2',
          question: 'AI napisała: „Przyczyną awarii była korozja”. W notatce było: „wstępnie korozja, do potwierdzenia”. Jak to ocenić?',
          options: [
            { id: 'a', text: 'To drobiazg — sens jest ten sam.', correct: false, explanation: 'To nie drobiazg: w raporcie hipoteza stałaby się ustaleniem.' },
            { id: 'b', text: 'To istotny błąd — niepewna informacja została podana jako pewna.', correct: true, explanation: 'Właśnie tak. Takie przesunięcia znaczenia są częste i groźne.' },
            { id: 'c', text: 'AI ma rację — korozja to najczęstsza przyczyna wycieków.', correct: false, explanation: '„Najczęstsza” nie znaczy „w tym przypadku”. Ustalenia wynikają z oględzin, nie ze statystyki.' },
          ],
          skill: 'weryfikacja',
          critical: true,
        },
      ],
    },
    {
      type: 'remember',
      stage: 'zapamietaj',
      rule: 'Ufaj, ale sprawdzaj: liczby, daty, nazwy i wnioski porównuj ze źródłem — a danych osobowych nie wklejaj wcale.',
      details: [
        'Proś AI: „Korzystaj tylko z podanych informacji i zaznaczaj to, co niepewne”.',
        'Najpierw anonimizuj, potem wklejaj.',
        'Hipoteza to nie fakt — pilnuj słów „wstępnie”, „prawdopodobnie”, „do potwierdzenia”.',
      ],
      tryAtWork: 'Następnym razem, gdy AI coś Ci streści, porównaj z oryginałem trzy rzeczy: liczby, daty i nazwy własne.',
    },
  ],
};

export const BEGINNER_LESSONS: Lesson[] = [LESSON_PIERWSZE_KROKI, LESSON_PIERWSZE_POLECENIE, LESSON_SPRAWDZANIE];
