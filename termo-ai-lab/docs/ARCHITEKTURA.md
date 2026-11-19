# TERMO AI LAB — koncepcja i architektura (Etap A)

## 1. Architektura

```
┌──────────────────────────── Przeglądarka / zainstalowana PWA / APK ───────────────────────────┐
│  React 19 + TypeScript + Tailwind 4 + Motion + Lucide + Recharts                              │
│                                                                                               │
│  ekrany (src/screens) ── komponenty ćwiczeń (src/components/exercises) ── Duszek AI (ghost)   │
│        │                          │                                                           │
│        ▼                          ▼                                                           │
│  logika (src/lib):  ocena demo · punktacja rubryk · adaptacja · gotowość · router · postęp    │
│        │                                                                                      │
│        ├── treści (src/content): lekcje, zadania + rubryki, sprawdziany, biblioteka, słownik  │
│        ├── zapis postępu: localStorage (zustand/persist, bezpieczny fallback w pamięci)       │
│        └── service worker (Workbox): pełny precache aplikacji → działanie offline             │
└───────────────┬───────────────────────────────────────────────────────────────────────────────┘
                │ HTTPS /api/*  (tylko treść promptu + id zadania; nigdy klucz API)
┌───────────────▼──────────────── Serwer Node (server/) ───────────────────────────────────────┐
│  Hono: /api/health · /api/evaluate · /api/run · /api/explain                                 │
│  walidacja zod · limit rozmiaru · limit zapytań/IP · nagłówki bezpieczeństwa (CSP)           │
│  Anthropic SDK (structured outputs) — klucz ANTHROPIC_API_KEY wyłącznie w zmiennych serwera  │
│  + serwowanie zbudowanej aplikacji (dist)                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Brak klucza / brak sieci / hosting statyczny** → aplikacja wykrywa to (`/api/health`) i przechodzi w **tryb demonstracyjny**: ocena regułowa, wyraźnie oznaczona.
* **Routing oparty o `#/…`** — działa offline, na dowolnej ścieżce, w PWA i w WebView Androida.
* **Treści oddzielone od interfejsu** — nowa lekcja to nowy obiekt w `src/content/lessons/*.ts`; nowe ćwiczenie trenażera to obiekt `PromptTask` z rubryką.

## 2. Mapa ekranów

| Ekran | Adres | Główny cel (jedno oczywiste działanie) |
|---|---|---|
| Powitanie | `#/` | „Rozpocznij” / „Kontynuuj naukę” (+ powrót do ostatniej lekcji) |
| Wprowadzenie (opcjonalne) | `#/wprowadzenie` | 3 plansze, „Pomiń” zawsze widoczne |
| Wybór poziomu | `#/poziomy` | 3 karty (zielona / żółta / czerwona), test doboru poziomu |
| Test doboru poziomu | `#/test-poziomu` | 5 pytań → sugestia (nie ocena) |
| Ekran główny | `#/start` | „Kontynuuj naukę” (największy element) |
| Lekcje | `#/lekcje/:poziom` | lista lekcji + pełny program modułów |
| Lekcja | `#/lekcja/:id` | kroki Zobacz → Porównaj → Spróbuj → Informacja zwrotna → Popraw → Zapamiętaj |
| Laboratorium promptów | `#/laboratorium` | zadania zawodowe + ćwiczenia celowane + sugestia adaptacyjna |
| Trenażer | `#/laboratorium/:id` | napisz prompt → „Sprawdź mój prompt” |
| Oceń moje osiągnięcia | `#/sprawdzian/:poziom` | 5 części → wynik gotowości i rekomendacja |
| Biblioteka promptów | `#/biblioteka`, `#/biblioteka/:id` | uzupełnij pola → kopiuj |
| Moje postępy | `#/postepy` | umiejętności, odznaki, czego się nauczyłeś |
| Ustawienia i instalacja | `#/ustawienia` | animacje, wielkość tekstu, instalacja PWA, tryb AI, dane |

Nawigacja: pasek boczny (komputer) / dolny pasek 5 pozycji (telefon). Każdy ekran wewnętrzny ma przycisk powrotu z nazwą celu („← Lekcje”).

## 3. Design system

* **Tło:** granat `#070b18` → `#050812`, grafit, subtelne gradienty radialne (fiolet, bursztyn, turkus).
* **Akcenty:** turkus `#2dd4bf` / błękit `#38bdf8` (technologia), fiolet `#a78bfa` (AI — wszystko, co wymaga modelu AI, jest fioletowe), bursztyn `#fbbf24` (ciepłownictwo, wskazówki).
* **Poziomy:** zielony `#34d399`, żółty `#facc15`, czerwony `#f87171` — w kartach, paskach postępu, ikonach i akcentach (zmienna CSS `--level-color`), nigdy jako tło całego ekranu.
* **Typografia:** Space Grotesk (nagłówki), Inter (tekst) — pliki lokalne (offline), podzbiory latin + latin-ext.
* **Komponenty:** karty glassmorphism z zaokrągleniem 20 px, przyciski min. 48 px wysokości, wyraźny fokus klawiatury, paski postępu, pierścień wyniku.
* **Ruch:** Motion; ustawienie „Animacje: jak w systemie / ograniczone / pełne” + respektowanie `prefers-reduced-motion`.
* **Wykres:** paleta serii zweryfikowana walidatorem (kontrast i rozróżnialność przy zaburzeniach widzenia barw), legenda + etykiety końców linii + widok tabeli.

## 4. Kluczowe mechanizmy

### Ocena promptów (trenażer)
* Każde zadanie ma **rubrykę**: kryteria z wagami (suma 100), opisem, wskazówką i umiejętnością.
* Każde kryterium oceniane jest na 3 poziomach: **brak (0) / częściowo (½) / spełnione (1)**.
* **Wynik = Σ waga × poziom** — liczba zawsze wynika z rubryki, bez losowości i fałszywej precyzji.
* **Tryb AI:** serwer wysyła do modelu zadanie, rubrykę i prompt uczestnika (jako dane, w znacznikach) i wymaga ustrukturyzowanej odpowiedzi (`output_config.format` + schemat zod). Odpowiedź jest walidowana (komplet kryteriów), a wynik serwer liczy sam z wag. Model dodaje uzasadnienie, mocne strony, wskazówki i ulepszoną wersję promptu.
* **Tryb demonstracyjny:** reguły szukają sygnałów elementów wymaganych w zadaniu (grupy rdzeni słów, bez polskich znaków). Interfejs oznacza go jako „Tryb demonstracyjny · ocena regułowa (bez AI)” i wyjaśnia ograniczenia.
* W obu trybach komunikat: wynik to szacunkowa ocena jakości polecenia według kryteriów ćwiczenia, nie gwarancja poprawności odpowiedzi AI.
* Wykrywanie danych osobowych (telefon, PESEL, e-mail) → ostrzeżenie.
* Zadania z danymi mają **wartości referencyjne** wyliczane z danych źródłowych; po uruchomieniu promptu w AI aplikacja pokazuje, które wartości występują w odpowiedzi.

### Inteligentne dopasowanie nauki (`src/lib/adaptive.ts`)
* Minimum 3 próby, zanim pojawi się sugestia (wcześniej tylko zachęta).
* Umiejętność wypada słabo (średni poziom kryteriów < ½) w ≥ 2 z 3 ostatnich prób → **ćwiczenie celowane** na tę umiejętność, z informacją o najmocniejszej umiejętności.
* Średnia 3 ostatnich prób ≥ 85 → **trudniejsze zadanie** (kolejny poziom).
* Opisane jako „sugestia na podstawie ostatnich ćwiczeń”, nie diagnoza.

### Oceń moje osiągnięcia (`src/lib/assessment.ts`)
* 5 obszarów: zasady (15%), pisanie promptu (25%), poprawianie instrukcji (20%), ocena wiarygodności (25%), zadanie praktyczne (15%).
* ≥ 75 i brak błędów krytycznych i wiarygodność ≥ 50 → rekomendacja przejścia.
* **Błąd krytyczny** (przeoczone zmyślenie AI, pozostawione dane osobowe, decyzja eksploatacyjna oddana AI, błędna odpowiedź w pytaniu o bezpieczeństwo) blokuje rekomendację niezależnie od średniej.
* 55–74 → „jesteś blisko”, dwa obszary do utrwalenia z linkami do lekcji; < 55 → nauka na obecnym poziomie.
* Ocena nie zależy od liczby ukończonych lekcji i nie blokuje zmiany poziomu.

### Duszek AI
* Każdy ekran i każdy krok lekcji rejestruje pomoc: proste wyjaśnienie, stopniowe wskazówki (bez gotowej odpowiedzi) i następny krok.
* „Pokaż mi, jak korzystać z aplikacji” → samouczek podświetlający elementy ekranu (`data-tour`), sterowany myszą i klawiaturą (←, →, Esc).
* Słownik pojęć działa offline; „Zapytaj model AI” tylko przy dostępnym AI, oznaczone fioletem.

### Grywalizacja bez presji
Punkty za ukończone lekcje, pierwsze wykonanie ćwiczeń i poprawę najlepszego wyniku; 12 odznak (m.in. „Krok po kroku” za poprawę promptu o 20 pkt). Brak serii dziennych, kar i przypomnień.

### Bezpieczeństwo i odpowiedzialność
* Klucz API tylko na serwerze; limit zapytań, limit rozmiaru, walidacja wejścia, CSP.
* Wszystkie dane w ćwiczeniach są fikcyjne; prompt uczestnika w ocenie traktowany jako dane (ochrona przed wstrzykiwaniem poleceń).
* Aplikacja nie steruje infrastrukturą; treści konsekwentnie uczą, że decyzje eksploatacyjne podejmuje człowiek.
