import type { PromptTask } from '../types';
import { STRATY_CIEPLA, ZGLOSZENIA_AWARII } from '../materials';
import { formatPl, heatLossStats } from '../chartData';

const loss = heatLossStats();

export const TASK_WIELOETAPOWA: PromptTask = {
  id: 't-instrukcja-wieloetapowa',
  level: 'zaawansowany',
  kind: 'chain',
  title: 'Wieloetapowa analiza zgłoszeń awarii',
  short: 'Zaprojektuj instrukcję z etapami i punktami kontrolnymi.',
  scenario:
    'Masz pięć zgłoszeń awarii z listopada. Zaprojektuj wieloetapową instrukcję dla AI: najpierw klasyfikacja zgłoszeń według jasno określonych kryteriów, potem zestawienie, następnie wnioski i dopiero na końcu szkic notatki dla kierownika. Wbuduj punkty kontrolne, w których AI czeka na Twoje potwierdzenie, oraz zasady rzetelności.',
  materials: [{ title: ZGLOSZENIA_AWARII.title, content: ZGLOSZENIA_AWARII.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Pracujemy w etapach. Etap 1: …',
  simpleExplanation:
    'Zamiast jednego wielkiego polecenia rozpisz pracę na kroki — jak instrukcję stanowiskową. Po ważnych krokach AI ma się zatrzymać i poczekać na Twoje „OK”. Dzięki temu poprawiasz błędy na bieżąco, zanim wpłyną na wnioski.',
  hints: [
    'Ponumeruj etapy: 1) klasyfikacja, 2) zestawienie, 3) wnioski, 4) szkic notatki.',
    'Określ kryteria klasyfikacji, np. typ awarii, liczba odbiorców bez ciepła, czas usunięcia.',
    'Dodaj punkt kontrolny: „Po etapie 1 zatrzymaj się i poczekaj na moje potwierdzenie”.',
    'Wymagaj formatu wyników pośrednich (np. tabela) i oznaczania braków danych.',
  ],
  criteria: [
    {
      id: 'etapy',
      skill: 'struktura',
      weight: 25,
      label: 'Etapy pracy',
      description: 'Instrukcja dzieli pracę na co najmniej trzy uporządkowane etapy.',
      missingPhrase: 'podziału pracy na kolejne etapy',
      tip: 'Rozpisz etapy z numerami: „Etap 1… Etap 2… Etap 3…”.',
      praise: 'Praca jest rozpisana na czytelne etapy.',
      demo: {
        groups: [
          ['etap', 'krok', 'faza'],
          ['najpierw', 'po pierwsze', '1\\.', '1\\)'],
          ['nastepnie', 'potem', 'po drugie', '2\\.', '2\\)'],
          ['na koniec', 'na zakonczenie', 'ostatni', '3\\.', '3\\)', '4\\.', '4\\)'],
        ],
        full: 3,
      },
    },
    {
      id: 'kontrola',
      skill: 'iteracja',
      weight: 20,
      label: 'Punkty kontrolne',
      description: 'AI zatrzymuje się po kluczowych etapach i czeka na potwierdzenie człowieka.',
      missingPhrase: 'punktów kontrolnych, w których czeka na Twoje potwierdzenie',
      tip: 'Dopisz: „Po każdym etapie zatrzymaj się i poczekaj na moje potwierdzenie”.',
      praise: 'Masz punkty kontrolne — błędy wyłapiesz na bieżąco.',
      demo: {
        groups: [['zatrzymaj', 'poczekaj', 'zaczekaj', 'zapytaj mnie', 'potwierdz', 'zanim przejdziesz', 'akceptac', 'zatwierdz', 'moja zgod']],
        full: 1,
      },
    },
    {
      id: 'kryteria',
      skill: 'cel',
      weight: 20,
      label: 'Kryteria klasyfikacji',
      description: 'Określone, według czego AI ma klasyfikować zgłoszenia.',
      missingPhrase: 'kryteriów klasyfikacji zgłoszeń',
      tip: 'Podaj kryteria: typ awarii, wpływ na odbiorców (liczba budynków), czas usunięcia.',
      praise: 'Kryteria klasyfikacji są jasne i sprawdzalne.',
      demo: {
        groups: [
          ['klasyfik', 'kategori', 'podziel', 'przypisz', 'typ awarii', 'grupuj', 'pogrupuj'],
          ['kryteri', 'wedlug', 'skala', 'priorytet', 'pilnosc', 'wplyw', 'liczba budynk', 'czas usuni'],
        ],
        full: 2,
      },
    },
    {
      id: 'format',
      skill: 'format',
      weight: 15,
      label: 'Format wyników pośrednich',
      description: 'Wyniki etapów mają określony format (np. tabela z kolumnami).',
      missingPhrase: 'formatu wyników pośrednich',
      tip: 'Dopisz: „Wynik etapu 1 przedstaw w tabeli: zgłoszenie – kategoria – uzasadnienie”.',
      praise: 'Wyniki pośrednie mają jasny format.',
      demo: { groups: [['tabel', 'kolumn', 'json', 'list', 'wiersz', 'format', 'zestawien']], full: 1 },
    },
    {
      id: 'rzetelnosc',
      skill: 'weryfikacja',
      weight: 20,
      label: 'Rzetelność',
      description: 'AI pracuje tylko na zgłoszeniach i oznacza braki oraz niepewności.',
      missingPhrase: 'zasad rzetelności (tylko dane ze zgłoszeń, oznaczanie braków)',
      tip: 'Dopisz: „Korzystaj tylko ze zgłoszeń. Braki i niepewności oznaczaj, nie uzupełniaj ich domysłami”.',
      praise: 'Pilnujesz rzetelności na każdym etapie.',
      demo: {
        groups: [
          ['nie wymyslaj', 'nie zgaduj', 'tylko na podstawie', 'wylacznie', 'nie dodawaj', 'tylko ze zgloszen', 'tylko z danych'],
          ['oznacz', 'zaznacz', 'niepewn', 'brak danych', 'brakuj', 'hipotez', 'do weryfikacji', 'zrodl', 'domysl'],
        ],
        full: 2,
      },
    },
  ],
  examplePrompt:
    'Przeanalizujemy pięć zgłoszeń awarii (poniżej) w etapach. Korzystaj wyłącznie z treści zgłoszeń; braki danych oznaczaj jako „brak danych”, nie uzupełniaj ich domysłami.\n\nEtap 1 — klasyfikacja. Przypisz każde zgłoszenie do kategorii: sieć magistralna / sieć rozdzielcza i przyłącza / węzeł / instalacja odbiorcy. Oceń wpływ na odbiorców (liczba budynków bez ciepła) i czas usunięcia. Wynik: tabela zgłoszenie – kategoria – wpływ – czas – uzasadnienie. Zatrzymaj się i poczekaj na moje potwierdzenie.\n\nEtap 2 — zestawienie: liczba zgłoszeń i suma czasu przerw w każdej kategorii.\n\nEtap 3 — wnioski: maks. 3 obserwacje, każda z odniesieniem do numerów zgłoszeń. Zatrzymaj się po tym etapie.\n\nEtap 4 — szkic notatki dla kierownika (maks. 10 zdań), z wnioskami oznaczonymi jako propozycje do decyzji.\n\n[zgłoszenia]',
  exampleWhy: [
    'Etapy są ponumerowane i mają jasne rezultaty.',
    'Kryteria klasyfikacji są jawne — można sprawdzić każdą decyzję AI.',
    'Punkty kontrolne pozwalają poprawić klasyfikację, zanim wpłynie na wnioski.',
    'Każdy wniosek musi odwoływać się do konkretnych zgłoszeń.',
  ],
  verifyTip:
    'Zweryfikuj klasyfikację: Z5 to usterka po stronie odbiorcy, a Z3 nie miała wpływu na odbiorców. Sprawdź sumy czasów w zestawieniu.',
  minWords: 35,
};

export const TASK_ASYSTENT: PromptTask = {
  id: 't-asystent-dyspozytora',
  level: 'zaawansowany',
  kind: 'system',
  title: 'Instrukcja stała dla własnego asystenta',
  short: 'Zaprojektuj instrukcję „Asystenta komunikatów dyspozytorni”.',
  scenario:
    'Projektujesz własnego asystenta AI (np. Projekt w Claude, własny GPT w ChatGPT lub agent w Copilot), który pomaga dyspozytorom przygotowywać projekty komunikatów o przerwach w dostawie ciepła. Napisz jego instrukcję stałą: rolę, zakres i granice, dane, o które ma dopytać, format komunikatów oraz zasady ochrony danych i weryfikacji.',
  placeholder: 'Np. Jesteś asystentem dyspozytorni… Twoje zadanie… Zawsze…',
  simpleExplanation:
    'Instrukcja stała to „regulamin” asystenta — AI czyta ją przed każdą rozmową. Opisz: kim jest asystent, co robi, czego NIE robi, o co ma dopytać, jak mają wyglądać komunikaty i jak ma chronić dane.',
  hints: [
    'Zacznij od roli i zadania: „Jesteś asystentem dyspozytorni. Przygotowujesz projekty komunikatów o przerwach w dostawie ciepła”.',
    'Określ granice: asystent przygotowuje projekty, decyzje i publikację zatwierdza dyspozytor.',
    'Wymień dane, o które ma dopytać, jeśli ich brakuje: termin, adresy, powód, zakres (ogrzewanie / ciepła woda).',
    'Dodaj zasady: nie wpisuj danych osobowych, nie wymyślaj terminów, oznacz rzeczy do potwierdzenia.',
  ],
  criteria: [
    {
      id: 'rola',
      skill: 'struktura',
      weight: 15,
      label: 'Rola i zadanie',
      description: 'Jasna rola asystenta i jego główne zadanie.',
      missingPhrase: 'roli i głównego zadania asystenta',
      tip: 'Zacznij od: „Jesteś asystentem dyspozytorni. Twoim zadaniem jest…”.',
      praise: 'Rola i zadanie asystenta są jasne.',
      demo: {
        groups: [
          ['jestes', 'twoja rola', 'dzialasz jako', 'asystent', 'twoim zadaniem'],
          ['komunikat', 'ogloszen', 'informacj', 'wiadomosc', 'pism'],
        ],
        full: 2,
      },
    },
    {
      id: 'granice',
      skill: 'ograniczenia',
      weight: 20,
      label: 'Zakres i granice',
      description: 'Asystent przygotowuje projekty; decyzje i publikacja należą do człowieka.',
      missingPhrase: 'granic odpowiedzialności asystenta',
      tip: 'Dopisz: „Przygotowujesz wyłącznie projekty. Decyzję o publikacji podejmuje dyspozytor”.',
      praise: 'Granice są jasne — decyzje zostają po stronie człowieka.',
      demo: {
        groups: [
          ['nie odpowiadaj', 'tylko', 'wylacznie', 'poza zakres', 'nie zajmuj', 'odmow', 'nie podejmuj', 'nie decyd', 'nie publikuj'],
          ['decyzj', 'zatwierdz', 'czlowiek', 'dyspozytor', 'projekt', 'szkic', 'wersj robocz', 'akceptac'],
        ],
        full: 2,
      },
    },
    {
      id: 'dopytywanie',
      skill: 'dane',
      weight: 20,
      label: 'Wymagane dane i dopytywanie',
      description: 'Lista danych potrzebnych do komunikatu i zasada dopytywania o braki.',
      missingPhrase: 'listy wymaganych danych i zasady dopytywania o braki',
      tip: 'Dopisz: „Jeśli brakuje terminu, adresów, powodu lub zakresu przerwy — zapytaj, zanim napiszesz komunikat”.',
      praise: 'Asystent dopyta o brakujące dane zamiast zgadywać.',
      demo: {
        groups: [
          ['zapytaj', 'dopytaj', 'popros o', 'jesli brakuje', 'gdy brakuje', 'brakujac', 'uzupelni', 'jezeli brak'],
          ['termin', 'adres', 'powod', 'czas', 'zakres', 'godzin', 'dat'],
        ],
        full: 2,
      },
    },
    {
      id: 'format',
      skill: 'format',
      weight: 20,
      label: 'Format i styl komunikatów',
      description: 'Stały układ komunikatu i zasady stylu.',
      missingPhrase: 'formatu i stylu komunikatów',
      tip: 'Opisz szablon: temat, termin, zakres, powód, kontakt — styl prosty i uprzejmy, maks. 8 zdań.',
      praise: 'Komunikaty będą miały spójny format i styl.',
      demo: {
        groups: [
          ['format', 'szablon', 'struktur', 'temat', 'naglow', 'punkt', 'sekcj', 'uklad'],
          ['ton', 'styl', 'uprzejm', 'rzeczow', 'prost', 'zrozumial', 'zargon', 'dlugos', 'krotk', 'zdan'],
        ],
        full: 2,
      },
    },
    {
      id: 'bezpieczenstwo',
      skill: 'bezpieczenstwo',
      weight: 25,
      label: 'Ochrona danych i weryfikacja',
      description: 'Zakaz danych osobowych, zakaz wymyślania faktów, oznaczanie rzeczy do potwierdzenia.',
      missingPhrase: 'zasad ochrony danych i weryfikacji',
      tip: 'Dopisz: „Nie umieszczaj danych osobowych. Nie wymyślaj terminów — oznacz je jako »do potwierdzenia«”.',
      praise: 'Asystent chroni dane i nie zmyśla faktów.',
      demo: {
        groups: [
          ['dane osob', 'nazwisk', 'telefon', 'anonim', 'poufn', 'wrazliw', 'rodo', 'prywatn'],
          ['sprawdz', 'zweryfik', 'niepewn', 'oznacz', 'nie wymyslaj', 'nie zgaduj', 'do potwierdzenia', 'nie dodawaj'],
        ],
        full: 2,
      },
    },
  ],
  examplePrompt:
    'Jesteś asystentem dyspozytorni sieci ciepłowniczej. Twoim zadaniem jest przygotowywanie PROJEKTÓW komunikatów o planowanych i awaryjnych przerwach w dostawie ciepła dla zarządców nieruchomości i mieszkańców.\n\nZakres: zajmujesz się tylko komunikatami. Nie podejmujesz decyzji eksploatacyjnych i nie publikujesz niczego — każdy projekt zatwierdza dyspozytor.\n\nZanim napiszesz komunikat, upewnij się, że znasz: termin (data, godziny), adresy, zakres (ogrzewanie / ciepła woda), powód, kontakt. Jeśli czegoś brakuje — zapytaj. Nie wymyślaj terminów ani przyczyn; niepewne informacje oznacz jako [DO POTWIERDZENIA].\n\nFormat: temat; 1) co się stanie, 2) kiedy, 3) gdzie, 4) dlaczego, 5) kontakt (Pogotowie ciepłownicze 993). Styl uprzejmy, prosty, bez żargonu, maks. 8 zdań.\n\nNie umieszczaj danych osobowych (nazwisk, numerów prywatnych telefonów). Jeśli użytkownik je poda, zastąp je opisem roli, np. „zarządca budynku”.',
  exampleWhy: [
    'Rola, zadanie i granice są jasne — asystent tworzy tylko projekty.',
    'Lista wymaganych danych i zasada dopytywania eliminują zgadywanie.',
    'Szablon komunikatu zapewnia powtarzalną jakość.',
    'Zasady ochrony danych i oznaczanie niepewności są wbudowane w instrukcję.',
  ],
  verifyTip:
    'Przetestuj asystenta trzema rozmowami: z kompletem danych, z brakującym terminem i z danymi osobowymi. Sprawdź, czy zachowuje się zgodnie z instrukcją.',
  minWords: 40,
};

export const TASK_OBLICZENIA: PromptTask = {
  id: 't-test-obliczen',
  level: 'zaawansowany',
  kind: 'data',
  title: 'Sprawdzalne obliczenie strat ciepła',
  short: 'Poproś AI o obliczenia, które da się zweryfikować krok po kroku.',
  scenario:
    'Potrzebujesz obliczyć straty ciepła w sieci za październik: w GJ, w procentach i w MWh. Napisz prompt, który wymusi sprawdzalne obliczenia: dane wejściowe z jednostkami, pokazane kroki i wzory, jawne założenia (np. szacowane odczyty liczników) i samokontrolę wyniku.',
  materials: [{ title: STRATY_CIEPLA.title, content: STRATY_CIEPLA.content, copyable: true, attachToRun: true }],
  placeholder: 'Np. Oblicz straty ciepła na podstawie… Pokaż…',
  simpleExplanation:
    'AI potrafi się pomylić w rachunkach, szczególnie przy przeliczaniu jednostek. Dlatego polecenie powinno wymagać pokazania każdego kroku, wzoru i jednostek oraz sprawdzenia wyniku — wtedy błąd zobaczysz od razu.',
  hints: [
    'Przepisz dane z jednostkami (GJ) i okres.',
    'Wymagaj pokazania wzoru i każdego kroku obliczeń.',
    'Poproś o jawne przeliczenie GJ na MWh (1 MWh = 3,6 GJ) — to częste źródło błędów.',
    'Dodaj samokontrolę: np. sprawdzenie wyniku inną metodą i wskazanie założeń (szacowane odczyty).',
  ],
  criteria: [
    {
      id: 'dane',
      skill: 'dane',
      weight: 20,
      label: 'Dane z jednostkami',
      description: 'Dane wejściowe podane lub wskazane wraz z jednostkami.',
      missingPhrase: 'danych wejściowych z jednostkami',
      tip: 'Przepisz: „ciepło wprowadzone 48 500 GJ, ciepło sprzedane 41 230 GJ, październik”.',
      praise: 'Dane wejściowe mają jednostki — świetnie.',
      demo: {
        groups: [
          ['gj', 'mwh', 'jednost'],
          ['wprowadz', 'sprzedan', 'dostarcz', 'produkc', 'zuzyc', 'ponizsz', 'dane'],
        ],
        full: 2,
      },
    },
    {
      id: 'kroki',
      skill: 'weryfikacja',
      weight: 25,
      label: 'Pokazane obliczenia',
      description: 'AI ma pokazać wzór i każdy krok obliczeń.',
      missingPhrase: 'wymogu pokazania wzoru i kroków obliczeń',
      tip: 'Dopisz: „Pokaż wzór i każdy krok obliczeń z jednostkami”.',
      praise: 'Wymagasz pokazania obliczeń — łatwo je sprawdzisz.',
      demo: {
        groups: [['pokaz', 'krok po kroku', 'kroki', 'wzor', 'rozpisz', 'tok oblicz', 'etap oblicz', 'wyjasnij jak']],
        full: 1,
      },
    },
    {
      id: 'jednostki',
      skill: 'dane',
      weight: 15,
      label: 'Przeliczenia jednostek',
      description: 'Jawne przeliczenie GJ → MWh i wynik procentowy.',
      missingPhrase: 'jawnego przeliczenia jednostek',
      tip: 'Dopisz: „Przelicz GJ na MWh (1 MWh = 3,6 GJ) i podaj stratę w procentach”.',
      praise: 'Pilnujesz przeliczeń jednostek.',
      demo: {
        groups: [['przelicz', '3[,.]6', 'gj na mwh', 'mwh', 'procent', '%']],
        full: 1,
      },
    },
    {
      id: 'zalozenia',
      skill: 'ograniczenia',
      weight: 20,
      label: 'Założenia i ograniczenia',
      description: 'AI ma wskazać założenia (np. szacowane odczyty) i ich wpływ na wynik.',
      missingPhrase: 'prośby o wskazanie założeń i ograniczeń',
      tip: 'Dopisz: „Wypisz założenia i ograniczenia, np. wpływ szacowanych odczytów liczników”.',
      praise: 'AI ujawni założenia — wiesz, na ile ufać wynikowi.',
      demo: {
        groups: [['zalozen', 'zaloz', 'ogranicz', 'nie uwzgledni', 'pomin', 'dokladnosc', 'zaokragl', 'niepewn', 'szacow', 'legalizac']],
        full: 1,
      },
    },
    {
      id: 'kontrola',
      skill: 'weryfikacja',
      weight: 20,
      label: 'Samokontrola wyniku',
      description: 'AI ma sprawdzić wynik (np. inną metodą lub szacunkiem).',
      missingPhrase: 'samokontroli wyniku',
      tip: 'Dopisz: „Na końcu sprawdź wynik inną metodą i oceń, czy jest realny”.',
      praise: 'Wbudowana samokontrola zmniejsza ryzyko błędu.',
      demo: {
        groups: [['sprawdz', 'zweryfik', 'kontrol', 'porownaj', 'test', 'oszacuj', 'realn', 'odwrotn', 'przelicz ponownie']],
        full: 1,
      },
    },
  ],
  examplePrompt:
    'Oblicz straty ciepła w sieci za październik na podstawie danych: ciepło wprowadzone do sieci 48 500 GJ, ciepło sprzedane odbiorcom 41 230 GJ.\n\n1) Podaj wzór i pokaż każdy krok obliczeń z jednostkami.\n2) Wynik podaj w GJ, w % ciepła wprowadzonego oraz w MWh (przelicz jawnie: 1 MWh = 3,6 GJ).\n3) Wypisz założenia i ograniczenia — m.in. wpływ szacowanych odczytów 3 liczników w legalizacji.\n4) Na końcu sprawdź wynik inną metodą (np. odwrotnym przeliczeniem) i oceń, czy wartość jest realna.\n\nNie zaokrąglaj wyników pośrednich; wynik końcowy podaj z dokładnością do 0,1.',
  exampleWhy: [
    'Dane wejściowe mają jednostki.',
    'Każdy krok i wzór będą widoczne — łatwo wychwycić błąd.',
    'Przeliczenie GJ → MWh jest jawne.',
    'Założenia i samokontrola zwiększają wiarygodność.',
  ],
  verifyTip: `Wartości referencyjne: strata ${loss.lossGJ.toLocaleString('pl-PL')} GJ, czyli ${formatPl(loss.lossPct)}% ciepła wprowadzonego, ok. ${formatPl(loss.lossMWh)} MWh.`,
  referenceFacts: [
    { label: 'Strata ciepła [GJ]', value: '7270', unit: 'GJ', alternatives: ['7 270', '7 270', '7.270'] },
    { label: 'Strata w % ciepła wprowadzonego', value: formatPl(loss.lossPct), unit: '%', alternatives: [String(loss.lossPct), '14,99', '14.99', '15,0', '15.0'] },
    { label: 'Strata w MWh', value: formatPl(loss.lossMWh), unit: 'MWh', alternatives: [String(loss.lossMWh), '2019', '2 019', '2 019,4'] },
  ],
  minWords: 25,
};
