# TERMO AI LAB — Interaktywna Akademia Sztucznej Inteligencji

Aplikacja edukacyjna (PWA) uczącą pracowników branży ciepłowniczej praktycznego, skutecznego i odpowiedzialnego korzystania z asystentów AI (ChatGPT, Claude, Microsoft Copilot). Nauka przez działanie: krótkie lekcje, trenażer promptów z oceną 0–100, ćwiczenia „Znajdź błąd AI”, praca z wykresem i danymi źródłowymi, sprawdziany gotowości, biblioteka gotowych promptów i wirtualny przewodnik „Duszek AI”.

Wszystkie teksty interfejsu i treści są po polsku. Wszystkie dane w ćwiczeniach są fikcyjne.

---

## Najprostszy sposób: jeden plik, bez instalacji

**`TERMO-AI-LAB.html`** to cała aplikacja w jednym pliku (ok. 1,5 MB): kod, wygląd, fonty, wszystkie lekcje i ćwiczenia.

1. Pobierz plik i zapisz go w stałym miejscu (np. na pulpicie).
2. Kliknij go dwukrotnie — otworzy się w przeglądarce (Edge, Chrome i inne).
3. Gotowe. Nie potrzeba Internetu, konta ani instalowania programów.

Postęp zapisuje się w przeglądarce, w której otwierasz plik. Przeniesienie na inny komputer: *Ustawienia → Pobierz kopię postępów*, a tam *Wczytaj kopię postępów*. W tej wersji ocena promptów działa w trybie demonstracyjnym (ocena modelem AI wymaga wersji z serwerem — poniżej).

Zbudowanie pliku ze źródeł: `npm run build:standalone` → `standalone/TERMO-AI-LAB.html` (test: `npm run test:standalone`).

---

## Co zawiera wersja 1.0 (MVP)

| Element | Stan |
|---|---|
| Ekran powitalny z animowaną siecią połączeń, opcjonalne wprowadzenie z „Pomiń” | ✅ |
| Wybór 3 poziomów (zielony / żółty / czerwony), test doboru poziomu, zmiana poziomu w każdej chwili | ✅ |
| Ekran główny („Gotowy na kolejne odkrycie?”) z hierarchią: Kontynuuj naukę → Laboratorium / Oceń osiągnięcia | ✅ |
| **9 pełnych lekcji** (3 na poziom), każda ze strukturą Zobacz → Porównaj → Spróbuj → Informacja zwrotna → Popraw → Zapamiętaj i 2–5 elementami interaktywnymi | ✅ |
| Trenażer promptów: rubryka z wagami, wynik 0–100 z uzasadnieniem, co dobre / czego brakuje / przykład, poprawki z porównaniem prób | ✅ |
| 8 zadań zawodowych + 6 ćwiczeń celowanych + 6 zadań sprawdzianowych (20 rubryk) | ✅ |
| Mechaniki: napisz prompt, napraw prompt, który lepszy, wykres z danymi źródłowymi, znajdź błąd AI, uporządkuj dokument, symulacja rozmowy, dopasowanie, kolejność, anonimizacja, budowa instrukcji z klocków | ✅ |
| Krótkie testy wiedzy z uzasadnieniem każdej odpowiedzi | ✅ |
| „Oceń moje osiągnięcia” — 5 obszarów, progi gotowości, błędy krytyczne blokujące rekomendację | ✅ (3 poziomy) |
| Duszek AI: samouczek ekranu, „Nie rozumiem zadania”, stopniowe wskazówki, „Co dalej?”, słownik 15 pojęć | ✅ (działa offline) |
| Biblioteka 16 promptów zawodowych (9 kategorii) z polami, podglądem, edycją, kopiowaniem i wskazówką weryfikacji | ✅ |
| Punkty, 12 odznak, umiejętności, „czego się nauczyłeś” — bez presji i bez kar | ✅ |
| Inteligentne dopasowanie: ćwiczenia celowane / trudniejsze zadania według jawnych reguł | ✅ |
| Automatyczny zapis postępu, przywracanie ostatniej lekcji, eksport postępu | ✅ |
| PWA: manifest, ikony, samodzielne okno, service worker, pełne działanie offline (poza funkcjami AI) | ✅ |
| Serwer z bezpieczną warstwą AI (klucz tylko na serwerze), tryb demonstracyjny bez klucza | ✅ |
| Dostępność: kontrast, fokus klawiatury, duże pola klikalne, ograniczenie animacji, większy tekst | ✅ |
| Konfiguracja Android (Capacitor) + workflow GitHub Actions budujący APK | ✅ konfiguracja — patrz „Android APK” |

Pozostałe moduły programu (np. „Porównywanie wariantów”, „Automatyzacja powtarzalnych zadań”, „Projekt końcowy”) są widoczne w „Pełnym programie poziomu” jako przygotowana struktura do rozbudowy.

---

## Szybki start (komputer z Node.js 20+)

```bash
cd termo-ai-lab
npm install
npm run build        # build produkcyjny: aplikacja (dist/) + serwer (server-dist/)
npm start            # http://localhost:8787
```

Bez klucza API aplikacja działa w pełni w **trybie demonstracyjnym** (ocena regułowa, wyraźnie oznaczona).

### Włączenie oceny przez model AI (Claude)

1. Skopiuj `.env.example` do `.env` i wpisz `ANTHROPIC_API_KEY=…` (klucz z konsoli Anthropic).
2. `npm start` — serwer wczyta `.env`. W aplikacji pojawi się fioletowy znacznik „AI połączona”.

Klucz jest używany **wyłącznie po stronie serwera** i nigdy nie trafia do przeglądarki. Model domyślny: `claude-opus-5-5` (zmienna `AI_MODEL`). Zapytania do AI mają limit na adres IP (`AI_RATE_LIMIT`, domyślnie 40 / 10 min) i limit długości.

Funkcje korzystające z modelu AI (oznaczone fioletem): ocena semantyczna promptów z uzasadnieniem i ulepszoną wersją, „Uruchom mój prompt w AI” z porównaniem z wartościami źródłowymi, wyjaśnianie dowolnych pojęć przez Duszka.

### Tryb deweloperski

```bash
npm run dev:server   # API na :8787 (z automatycznym przeładowaniem)
npm run dev          # aplikacja na :5173 (proxy /api → :8787)
```

---

## Instalacja na urządzeniach (PWA)

Aplikację trzeba udostępnić pod adresem **HTTPS** (np. serwer firmowy, dowolny hosting Node.js) — `npm start` serwuje i aplikację, i API. Do samej nauki w trybie demonstracyjnym wystarczy też hosting statyczny katalogu `dist/`.

* **Windows (Edge / Chrome):** otwórz adres aplikacji → ikona instalacji w pasku adresu (lub menu ⋯ → Aplikacje → Zainstaluj). Aplikacja pojawi się w menu Start i otworzy w osobnym oknie.
* **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.
* **iPhone / iPad (Safari):** „Udostępnij” → „Do ekranu początkowego”.

Instrukcje są też w aplikacji: *Ustawienia i instalacja*. Na Windows instalacja PWA przez Edge daje natywne okno, skrót w menu Start i działanie offline — osobny instalator `.exe` (np. Electron) nie jest potrzebny.

---

## Android APK (Capacitor)

Projekt zawiera `capacitor.config.ts` i katalog `android/` wygenerowany przez Capacitor.

**Budowanie lokalne** (wymaga Android Studio / Android SDK i JDK 21):

```bash
# opcjonalnie: adres serwera API, z którego ma korzystać aplikacja mobilna
# (bez niego APK działa w trybie demonstracyjnym)
export VITE_API_BASE_URL=https://twoj-serwer.example.com
npm run cap:sync                  # build + kopiowanie do projektu Android
cd android && ./gradlew assembleDebug
# wynik: android/app/build/outputs/apk/debug/app-debug.apk
```

Serwer musi wtedy zezwalać na pochodzenie aplikacji: `ALLOWED_ORIGINS=https://localhost`.

**Budowanie w GitHub Actions:** workflow `.github/workflows/termo-ai-lab-android.yml` (w katalogu głównym repozytorium) buduje APK w chmurze i publikuje je jako artefakt do pobrania w zakładce *Actions*. Uruchamia się po zmianie plików w `termo-ai-lab/` lub ręcznie.

APK z wersji debug służy do testów i instalacji „z pliku” (trzeba zezwolić na instalację z nieznanych źródeł). Do dystrybucji w sklepie potrzebny jest podpisany build release (`assembleRelease` + własny klucz).

---

## Testy

```bash
npm test             # testy jednostkowe (Vitest): treści, rubryki, ocena, gotowość, adaptacja, serwer API
npm run test:e2e     # testy end-to-end (Playwright) — patrz nagłówek e2e/run-e2e.ts
```

Testy E2E przechodzą wszystkie 9 lekcji od początku do końca na podstawie treści, sprawdzian gotowości (w tym blokadę przy błędzie krytycznym), samouczek Duszka, trenażer z poprawą wyniku, bibliotekę ze schowkiem, trwałość postępu po przeładowaniu, przywracanie lekcji, tryb offline z service workerem, widok telefonu 360 px (brak przewijania poziomego), dostępność (axe-core, WCAG 2 A/AA) oraz ścieżki „z modelem AI” na atrapie modelu (`e2e/mock-ai-server.ts`).

---

## Struktura projektu

```
termo-ai-lab/
├─ src/
│  ├─ content/          treści oddzielone od interfejsu
│  │  ├─ lessons/       9 lekcji (beginner / intermediate / advanced)
│  │  ├─ tasks/         zadania trenażera z rubrykami (lekcje, ćwiczenia celowane, sprawdziany)
│  │  ├─ assessments.ts sprawdziany „Oceń moje osiągnięcia”
│  │  ├─ library.ts     biblioteka promptów
│  │  ├─ glossary.ts, badges.ts, tours.ts, tools.ts, placement.ts, levels.ts
│  │  └─ chartData.ts, materials.ts   dane fikcyjne + wartości referencyjne
│  ├─ lib/              ocena (scoring, demoEvaluator), adaptacja, gotowość, zapis postępu, router, API
│  ├─ components/       UI, ćwiczenia, Duszek AI i samouczek, układ
│  └─ screens/          ekrany aplikacji
├─ server/              Hono + Anthropic SDK (warstwa AI), limit zapytań, serwowanie dist
├─ tests/               Vitest
├─ e2e/                 Playwright + atrapa modelu AI
├─ android/             projekt Android (Capacitor)
└─ docs/ARCHITEKTURA.md koncepcja, mapa ekranów, design system, mechanizmy
```

### Jak dodać lekcję
Dodaj obiekt `Lesson` w `src/content/lessons/*.ts` (kroki: `concept`, `compare`, `choice`, `classify`, `match`, `order`, `builder`, `findError`, `redact`, `chat`, `chart`, `trainer`, `quiz`, `remember`) i wpisz jego `id` w module w `src/content/levels.ts`. Nowe zadanie trenażera to `PromptTask` z rubryką (suma wag = 100) w `src/content/tasks/`. Testy (`npm test`) sprawdzą spójność treści.

---

## Prywatność i odpowiedzialność

* Postęp zapisuje się tylko lokalnie w przeglądarce użytkownika; nie ma kont ani analityki.
* Do modelu AI trafia wyłącznie treść promptu, który użytkownik sam ocenia lub uruchamia.
* Aplikacja uczy anonimizacji, weryfikacji i tego, że decyzje eksploatacyjne podejmują kompetentni ludzie — AI jest narzędziem wspierającym specjalistę.

Fonty Inter i Space Grotesk — licencja SIL OFL 1.1 (`src/assets/fonts/LICENSE.txt`).
