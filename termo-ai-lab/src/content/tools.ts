/**
 * Praktyczne instrukcje dla popularnych asystentów AI.
 * Uwaga: wygląd i nazwy funkcji zewnętrznych usług mogą się zmieniać — opisy są ogólne.
 */

export interface ToolGuide {
  id: string;
  name: string;
  vendor: string;
  address: string;
  note: string;
  steps: string[];
}

export const TOOL_GUIDES: ToolGuide[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    address: 'chatgpt.com (lub aplikacja na telefon)',
    note: 'Popularny asystent ogólnego przeznaczenia. Sprawdź, czy w Twojej firmie dopuszczona jest wersja firmowa.',
    steps: [
      'Otwórz stronę lub aplikację i zaloguj się (konto prywatne lub firmowe — zgodnie z zasadami firmy).',
      'Na dole ekranu znajdziesz pole tekstowe. Wpisz polecenie zwykłymi zdaniami.',
      'Wyślij przyciskiem ze strzałką lub klawiszem Enter. Nowa linia w tekście: Shift + Enter.',
      'Aby dopytać lub poprawić wynik, pisz kolejną wiadomość w tej samej rozmowie.',
      'Nowy temat? Rozpocznij nową rozmowę (przycisk „Nowy czat”), żeby stare ustalenia nie mieszały się z nowymi.',
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    address: 'claude.ai (lub aplikacja na telefon i komputer)',
    note: 'Dobrze radzi sobie z długimi dokumentami i porządkowaniem tekstu. Funkcja Projekty pozwala zapisać stałe instrukcje i materiały.',
    steps: [
      'Otwórz stronę lub aplikację i zaloguj się zgodnie z zasadami firmy.',
      'W polu wiadomości wpisz polecenie. Dokument możesz dołączyć ikoną załącznika lub wkleić jego treść.',
      'Wyślij wiadomość. Odpowiedź możesz skopiować przyciskiem pod nią.',
      'Poprawki wpisuj w tej samej rozmowie, np. „Skróć do połowy”.',
      'Dla powtarzalnych zadań utwórz Projekt ze stałą instrukcją (poziom zaawansowany).',
    ],
  },
  {
    id: 'copilot',
    name: 'Microsoft Copilot',
    vendor: 'Microsoft',
    address: 'copilot.microsoft.com, a w firmie: Microsoft 365 Copilot (Teams, Outlook, Word)',
    note: 'W wielu firmach dostępna jest wersja Microsoft 365 Copilot powiązana z kontem służbowym — ma inne zasady ochrony danych niż wersja prywatna.',
    steps: [
      'Otwórz Copilot w przeglądarce lub w aplikacji Microsoft 365 (np. w Teams) i zaloguj się kontem służbowym, jeśli firma to umożliwia.',
      'W polu wiadomości wpisz polecenie i wyślij je.',
      'W Wordzie lub Outlooku Copilot może pomóc przy tekście, który właśnie piszesz — szukaj ikony Copilot.',
      'Dopytuj w tej samej rozmowie, aby poprawić wynik.',
      'Zanim wkleisz dokumenty firmowe, sprawdź politykę firmy dotyczącą narzędzi AI.',
    ],
  },
];
