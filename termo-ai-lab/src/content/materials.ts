/**
 * Materiały źródłowe do ćwiczeń. WSZYSTKIE dane są fikcyjne (syntetyczne).
 */

export const AWARIA_KWIATOWA = {
  title: 'Notatka z awarii — ul. Kwiatowa (dane fikcyjne)',
  content:
    'Data: 12 stycznia\n06:40 — zgłoszenie mieszkańca: para wydobywa się z komory K-7 przy ul. Kwiatowej 14.\n07:05 — brygada na miejscu (3 osoby). Potwierdzony wyciek na sieci rozdzielczej DN100 w komorze K-7.\n07:25 — odcięcie odcinka sieci. Bez ogrzewania i ciepłej wody: 6 budynków (ul. Kwiatowa 10–20, numery parzyste).\n08:30 — przyjazd koparki, rozpoczęcie odkopywania.\nPrzyczyna: wstępnie korozja zewnętrzna rury — do potwierdzenia po odkopaniu i oględzinach.\nPlanowane przywrócenie dostaw: 15:00.\n16:10 — przywrócenie dostaw ciepła do wszystkich budynków.\nUwagi: odcinek był ostatnio remontowany ponad 20 lat temu.',
};

export const NOTATKA_OBCHOD = {
  title: 'Notatka z obchodu — zapis roboczy (dane fikcyjne)',
  content:
    'obchód wt. rano, Marek + ja. komora K-12 — woda na dnie ok. 20 cm, trzeba wypompować, pilne?? zawór ZO-3 chodzi ciężko. K-14 ok. przy węźle W-27 (szkoła) manometr na powrocie pokazuje dziwnie, chyba uszkodzony, wymienić. K-12 drabina skorodowana — BHP!! izolacja na odcinku K-14–K-15 częściowo zdjęta, nie wiem kto, zgłosić do działu inwestycji? węzeł W-31 — wyciek na dławicy pompy, mały, kapie. aha w K-12 jeszcze brak pokrywy na jednym włazie, zabezpieczone taśmą tymczasowo. termin przeglądu W-27 — do sprawdzenia w harmonogramie. Marek mówi że W-31 był już zgłaszany w październiku.',
};

export const PRACE_MIESIAC = {
  title: 'Zestawienie prac eksploatacyjnych — październik (dane fikcyjne)',
  content:
    'Przeglądy komór ciepłowniczych: 14 (zaplanowano 16; 2 przełożone z powodu dostępu)\nAwarie usunięte: 3 (wyciek na przyłączu DN50 — 1, nieszczelna dławica zaworu — 2)\nWymiany zaworów odcinających: 2\nPłukanie instalacji przed sezonem: 1 węzeł (W-18)\nZgłoszenia od odbiorców: 21 (zbyt niska temperatura — 12, hałas w instalacji — 5, inne — 4)\nŚredni czas reakcji na zgłoszenie awaryjne: 38 min\nUwagi: brak części zamiennych do pomp w węźle W-22 — zamówienie w toku.',
};

export const ZGLOSZENIA_AWARII = {
  title: 'Zgłoszenia awarii — listopad (dane fikcyjne, zanonimizowane)',
  content:
    'Z1 (03.11): wyciek na przyłączu DN40 do budynku mieszkalnego; czas usunięcia 5 h; bez ciepła 1 budynek.\nZ2 (09.11): awaria pompy obiegowej w węźle grupowym; czas usunięcia 3 h; obniżone parametry w 4 budynkach.\nZ3 (15.11): nieszczelność dławicy zaworu w komorze; czas usunięcia 1,5 h; bez wpływu na odbiorców.\nZ4 (21.11): wyciek na sieci magistralnej DN300; czas usunięcia 14 h; bez ciepła 38 budynków.\nZ5 (27.11): zgłoszenie zbyt niskiej temperatury; po sprawdzeniu — usterka instalacji wewnętrznej budynku (po stronie odbiorcy).',
};

export const STRATY_CIEPLA = {
  title: 'Dane do obliczenia strat ciepła — październik (dane fikcyjne)',
  content:
    'Ciepło wprowadzone do sieci (licznik na wyjściu z ciepłowni): 48 500 GJ\nCiepło sprzedane odbiorcom (suma liczników u odbiorców): 41 230 GJ\nOkres: 1–31 października\nUwaga: 3 liczniki u odbiorców były w legalizacji przez 6 dni — w tym czasie zużycie szacowano.',
};

export const PROTOKOL_ODBIORU = {
  title: 'Protokół odbioru technicznego — przyłącze do budynku przy ul. Polnej (dane fikcyjne)',
  content:
    'Zakres: wykonanie przyłącza preizolowanego 2×DN50, długość 64 m, wraz z węzłem cieplnym.\nPróba szczelności: wykonana, wynik pozytywny.\nUsterki: 1) brak oznaczenia trasy taśmą ostrzegawczą na odcinku 12 m; 2) niedokręcona pokrywa skrzynki zasuwy; 3) brak dokumentacji powykonawczej w wersji elektronicznej.\nTermin usunięcia usterek: 14 dni.\nDecyzja komisji: odbiór warunkowy — po usunięciu usterek.',
};

export const ODCZYTY_LICZNIKA = {
  title: 'Odczyty licznika ciepła — węzeł W-18 (dane fikcyjne)',
  content: 'Stan na 1 października: 12 480,5 GJ\nStan na 1 listopada: 12 742,9 GJ\nStan na 1 grudnia: 13 118,2 GJ',
};
