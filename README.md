# DETAIL REEL AI

Platforma do analizy i montażu rolek reklamowych dla branży **car detailing**: przesyłasz nagrania → otrzymujesz ocenę 0–100 z uwagami sekunda po sekundzie → system przebudowuje montaż (lub składa go z surowych klipów) → edytujesz w przeglądarce → eksportujesz prawdziwy plik MP4 1080×1920.

Cały interfejs, raporty i komunikaty są po polsku.

---

## Co działa (zweryfikowane)

| Obszar | Stan | Jak to działa |
|---|---|---|
| Upload | ✅ | Strumieniowy `PUT /api/upload` (bez buforowania w RAM), limit rozmiaru, walidacja rozszerzenia **i sygnatury pliku** (magic bytes), potem FFprobe. MP4, MOV, WebM, MKV, M4V, AVI; audio MP3/WAV/M4A/AAC/OGG/FLAC; obrazy PNG/JPG/WebP. |
| Przetwarzanie mediów | ✅ | Worker: metadane (długość, rozdzielczość po rotacji, FPS, proporcje, kodeki), proxy H.264 do przeglądarki, miniatura, pasek klatek (sprite) do timeline, wykrywanie cięć (`select=gt(scene)`), pomiar ruchu/jasności/kontrastu/nasycenia/rozmycia (`signalstats`, `blurdetect`), klatka z każdej sceny. |
| Analiza audio | ✅ | Głośność EBU R128 (LUFS, true peak), cisza, obwiednia energii, **tempo (BPM) i beaty** (spectral flux + autokorelacja + kontrola oktawy), momenty wzrostu energii, waveform. |
| Analiza rolki (AI) | ✅* | Klatki z pierwszych sekund + po jednej na scenę (z podpisanymi czasami), dane techniczne, transkrypcja i profil klienta → **Claude** (structured outputs walidowane Zod). Wynik: punktacja 6 kategorii (25/20/15/15/15/10), podsumowanie, mocne/słabe strony, priorytetowe poprawki, optymalna długość, odpowiedzi na 13 pytań, uwagi z czasami, ≥5 hooków, brakujące ujęcia, napisy, rekomendacja muzyki, odczyt istniejących napisów. |
| Tryb bez AI | ✅ | Bez klucza API aplikacja działa w **wyraźnie oznaczonym trybie heurystycznym**: rzeczywiste pomiary (hook, jakość obrazu, tempo, długość, audio) i uwagi z czasami; kategorie wymagające rozumienia treści są oznaczone „brak danych”, a wynik jest przeliczany z mierzalnych kategorii (oznaczenie `*`). Hooki/ujęcia/napisy pochodzą wtedy z biblioteki szablonów i są tak opisane. |
| Raport | ✅ | Odtwarzacz + interaktywna oś czasu (zielony/żółty/czerwony, klik = przejście do momentu), karty uwag (ujęcie, problem, powód, sugestia, napis, nowa długość, priorytet), AI Reel Retention (prognoza heurystyczna z wyraźnym zastrzeżeniem), hooki z „Zastosuj hook”, doradca ujęć z checklistą do nagrania, napisy (tryb A transkrypcja / tryb B marketingowe), Music Advisor, 13 pytań, dane techniczne. |
| „POPRAW ROLKĘ Z AI” | ✅ | Nowy hook z najmocniejszej sceny, skrócone długie ujęcia (najlepsze okno wg ruchu i ostrości), usunięte słabe technicznie fragmenty, dopasowanie długości, ciągłość ścieżki muzycznej, napisy + CTA klienta, logo → **render MP4** → **automatyczna ponowna ocena** → widok Przed/Po (dwa odtwarzacze, tabela porównawcza, lista zmian). „Popraw słabe momenty” działa na segmentach z wykresu retencji. |
| Edytor | ✅ | Wielościeżkowa timeline (wideo, napisy, muzyka, logo, rozmycia, znaczniki uwag AI): przycinanie krawędziami, zmiana kolejności drag & drop, split, usuwanie, duplikowanie, prędkość, głośność, fade in/out, kadrowanie 9:16 (pozycja + zoom), przejścia (cięcie/przenikanie/przez czerń), napisy (5 stylów, font, wielkość, kolory, obrys, cień, tło, pozycja – także przeciąganiem w podglądzie, animacje), muzyka z waveformem i dopasowaniem cięć do beatów, logo, rozmycie obszaru (tablice/twarze), bezpieczne strefy IG/TikTok/Shorts, cofnij/ponów, skróty klawiszowe, **autosave** z kontrolą wersji, podgląd w czasie rzeczywistym i „Podgląd renderu” (rzeczywisty render 540×960). |
| Render / Export Studio | ✅ | FFmpeg `filter_complex` z **oryginałów** (nie proxy): input-seeking, prędkość (`setpts`/`atempo`), kadrowanie cover+zoom, normalizacja FPS, `xfade`/`acrossfade`, rozmycia, **napisy ASS przez libass** z tymi samymi fontami co podgląd, logo, miks muzyki z duckingiem (sidechain), normalizacja −14 LUFS. H.264 High + AAC 48 kHz, `faststart`. Postęp na żywo, anulowanie, ponawianie, SRT, podgląd ostatniej klatki, checklista przed publikacją (proporcje, rozdzielczość, długość, czytelność i bezpieczne strefy napisów, CTA, głośność zmierzona w pliku wynikowym, jakość, logo). |
| AI Auto Montaż | ✅ | Wiele surowych klipów → analiza każdego (AI rozpoznaje rodzaj ujęcia; bez AI – Twoje tagi + pomiary) → odrzucenie słabych fragmentów → historia wg stylu (hook → proces → detale → efekt → CTA) → długości ujęć wg tempa → przejścia tylko na granicach sekcji → muzyka z dopasowaniem do beatów i „wejściem” na efekt → napisy → logo → **rzeczywisty projekt timeline** do edycji i renderu. |
| Warianty A/B/C | ✅ | VIRAL / PREMIUM / SALES z osobnym podglądem, edycją, eksportem i tabelą porównawczą. |
| Czat montażysty | ✅* | AI zwraca odpowiedź + **operacje na projekcie** (walidowane schematem i referencjami); podsumowanie + „Zastosuj zmiany” (z cofaniem). Bez AI: obsługa najczęstszych poleceń regułami (oznaczone). |
| Generator pomysłów | ✅* | ≥10 pomysłów (hook, scenariusz sekunda po sekundzie, shot lista, napisy, ruch kamery, muzyka, styl); zapisywanie i zamiana w projekt z checklistą ujęć. Bez AI – biblioteka 11 sprawdzonych formatów (oznaczone). |
| Klienci | ✅ | Profile studiów (logo, kolory, styl, grupa docelowa, usługi, przewagi, CTA…) używane w analizie, napisach, montażu i opisach. AI ma zakaz wymyślania cen, promocji, lokalizacji i obietnic. |
| Premium | ✅ | Generator okładek (canvas: najlepsze kadry wg jakości, tytuł, kolory, kadrowanie, logo → PNG/JPG, zapis jako okładka), opis posta (IG, CTA, hashtagi, TikTok), szablony marki, checklista ujęć do sesji, checklista przed publikacją, **link do akceptacji klienta** (token, komentarze przy czasie, akceptacja/poprawki). |
| Bezpieczeństwo / RODO | ✅ | Sesje httpOnly (hash tokenu w bazie), scrypt, izolacja danych per użytkownik w każdym zapytaniu, pliki serwowane tylko właścicielowi (Range), klucze storage niejawne, limity (Redis), usuwanie projektów/plików/konta, automatyczne usuwanie po okresie retencji, rozmycie obszarów w eksporcie, nagłówki bezpieczeństwa. |

`✅*` — działa w obu trybach; pełna jakość wymaga klucza AI.

### Testy

- `npm test` — 32 testy (Vitest): parser metadanych, wykrywanie scen, statystyki obrazu, tempo/BPM (w tym regresja „połowy tempa”), proxy/sprite/klatki, walidacja sygnatur, operacje timeline (split/move/trim/duplicate/remove/dopasowanie długości/beaty), mapowanie źródło→timeline, ASS/SRT, **pełny render FFmpeg** (przejścia, napisy wszystkich stylów, logo, rozmycie, muzyka) z weryfikacją ffprobe, planer montażu dla 6 stylów, „Popraw rolkę”, heurystyki, klient AI na atrapie Messages API (kształt żądania, streaming, odmowa, zły JSON), konwersja schematów structured outputs.
- `npm run smoke` — test end-to-end na działającej aplikacji: rejestracja → upload MP4 → analiza → Popraw rolkę (render + ponowna ocena) → auto montaż z wariantami → render → pobranie MP4 i weryfikacja ffprobe.
- `npm run lint`, `npm run typecheck`, `npm run build` — bez błędów.

> Ścieżka AI została przetestowana na lokalnej atrapie API (identyczny protokół strumieniowy). Z prawdziwym kluczem jakość ocen zależy od modelu — raporty są ekspercką prognozą jakości kreatywnej, nie gwarancją wyświetleń ani sprzedaży.

---

## Architektura

```
Przeglądarka (Next.js App Router, React 19, Tailwind 4, komponenty w stylu shadcn/ui, Radix, Lucide, Motion)
   │  REST (route handlers) — upload strumieniowy, Range dla wideo
   ▼
Next.js (Node) ── PostgreSQL (Prisma) ── Redis (BullMQ: kolejka zadań, limity)
                                              │
                                              ▼
                                      Worker (tsx src/worker)
   1 Ingestion → 2 Preprocessing (FFprobe, proxy, sprite) → 3 Scene detection + statystyki obrazu
   → 4 Audio (LUFS, cisza, BPM, beaty) → 5 Transkrypcja (Whisper API / whisper.cpp)
   → 6 Analiza multimodalna (Claude, structured outputs + Zod) → 7 Silnik rekomendacji/heurystyki
   → 8 Plan montażu (timeline JSON) → 9 Render (FFmpeg + libass) → 10 Eksport (MP4, SRT, checklista)
```

- **Timeline jako jedno źródło prawdy** (`src/lib/timeline`): schemat Zod dokumentu, czyste operacje (używane przez edytor, czat AI i planer), mapowanie na tabele `TimelineTrack/TimelineItem/Subtitle`. Projekt przechowuje tylko referencje do plików i przedziały czasu — każdy render powstaje z oryginałów.
- **Render** (`src/lib/timeline/render-graph.ts`) — generator polecenia FFmpeg, testowany na prawdziwym FFmpeg.
- **Napisy**: ten sam algorytm łamania linii i te same pliki fontów (OFL, `public/fonts`) w podglądzie (DOM) i w renderze (ASS/libass) — wynik jest zgodny wizualnie. Zamiast Remotion użyto libass: lżejsze, bez przeglądarki headless na serwerze, natywnie wspiera animacje i podświetlanie słów.
- **Zadania w tle**: każde zadanie ma rekord `Job` (postęp, etap, błąd), anulowanie zabija proces FFmpeg / przerywa żądanie AI, ponawianie (automatyczne 2× dla błędów przejściowych + ręczne „Ponów”), codzienne czyszczenie danych po okresie retencji.
- **Storage**: lokalny katalog (dev) lub dowolny storage zgodny z S3 (AWS S3, Cloudflare R2, MinIO) — `STORAGE_DRIVER=s3`.

### Model danych

`User, Session, Client, Project, MediaAsset, VideoClip, Scene, Analysis, AnalysisFinding, ScoreCategory, EditingProject, TimelineTrack, TimelineItem, Subtitle, BrandTemplate, RenderJob, Export, ClientComment, ContentIdea, Job, UsageEvent` — zob. `prisma/schema.prisma`.

---

## Uruchomienie lokalne

Wymagania: **Node.js ≥ 20.9** (zalecane 22), **FFmpeg + FFprobe** z `libx264`, `libass`, `libmp3lame` (np. `apt install ffmpeg`, `brew install ffmpeg`), PostgreSQL 14+ i Redis 6+ (np. przez Docker).

```bash
# 1. Zależności
npm install

# 2. Baza i Redis (albo własne instancje)
docker compose up -d

# 3. Konfiguracja
cp .env.example .env
#   - ustaw APP_SECRET (openssl rand -hex 32)
#   - opcjonalnie ANTHROPIC_API_KEY (pełna analiza AI) i TRANSCRIPTION_* (mowa PL)

# 4. Migracje i dane demo
npx prisma migrate deploy
npm run db:seed          # konto: demo@detailreel.local / demo-detail-reel

# 5. Aplikacja i worker (dwa terminale)
npm run dev              # http://localhost:3000
npm run worker           # przetwarzanie, analiza, render
```

Produkcja: `npm run build && npm start` oraz `npm run worker` (worker skaluje się poziomo; równoległość `WORKER_CONCURRENCY`). Worker musi mieć dostęp do FFmpeg, katalogu `public/fonts` i tego samego storage co aplikacja.

### Konfiguracja API

| Zmienna | Opis |
|---|---|
| `ANTHROPIC_API_KEY` | Analiza multimodalna, czat, pomysły, opisy. Bez klucza: tryb heurystyczny. Model: `ANTHROPIC_MODEL` (domyślnie `claude-opus-5-5`, adaptive thinking, serwerowy fallback modelu przy odmowie klasyfikatora). Liczba klatek na analizę: `AI_MAX_FRAMES`. |
| `TRANSCRIPTION_PROVIDER=openai` + `TRANSCRIPTION_API_KEY` | Transkrypcja PL przez dowolne API zgodne z `/v1/audio/transcriptions` (OpenAI Whisper, Groq, faster-whisper-server) z czasami słów. `TRANSCRIPTION_API_URL`, `TRANSCRIPTION_MODEL`. |
| `TRANSCRIPTION_PROVIDER=whispercpp` | Offline: `WHISPER_CPP_BIN` + `WHISPER_CPP_MODEL`. |
| `MUSIC_LIBRARY_DIR` | Katalog z legalnie licencjonowaną muzyką do importu w Bibliotece. |
| `STORAGE_DRIVER=s3` + `S3_*` | Storage produkcyjny. |
| `RATE_LIMIT_*`, `MAX_UPLOAD_MB`, `MAX_VIDEO_DURATION_SEC` | Limity. |

Klucze trzymaj wyłącznie w zmiennych środowiskowych serwera — aplikacja ich nie wyświetla ani nie wysyła do przeglądarki.

---

## Jak przetestować

**Analiza filmu:** Analiza rolek → wybierz cel, platformę, usługę → przeciągnij MP4/MOV → obserwuj postęp → raport: kliknij czerwony znacznik na osi czasu (przeskok + karta uwagi), sprawdź zakładki Hooki / Co nagrać? / Muzyka / 13 pytań → „POPRAW ROLKĘ Z AI” → sekcja Przed/Po z nową oceną.

**Montaż i eksport:** AI Auto Montaż → utwórz projekt → wrzuć kilka klipów (opcjonalnie nadaj rodzaj ujęcia) i muzykę → „Generuj montaż” → porównaj warianty → „Edytuj”: przeciągnij klip, przytnij krawędź, dodaj CTA, przesuń napis w podglądzie, Ctrl+Z → „Eksport” → „Renderuj MP4” → pobierz MP4 i SRT → zakładka „Akceptacja klienta” → otwórz link w oknie prywatnym, dodaj komentarz przy czasie i zaakceptuj.

**Automatycznie:** `npm test` oraz `npm run smoke` (przy uruchomionych `npm run dev`/`start` i `npm run worker`).

---

## Ograniczenia i dalszy rozwój

- **Jakość ocen AI** zależy od modelu i klatek — analiza nie widzi pełnego ruchu między klatkami (pipeline klatkowy + pomiary ruchu). Kolejny krok: ewaluacja na zbiorze prawdziwych rolek studiów.
- **Retencja** to heurystyczna prognoza — integracja z Instagram Graph API / TikTok API pozwoliłaby kalibrować model na realnych danych.
- **Rozmycie twarzy/tablic** jest ręczne (prostokąt + czas). Automatyczna detekcja i śledzenie wymaga modelu detekcji (np. ONNX w workerze).
- **Podgląd w edytorze** odtwarza przejścia w przybliżeniu (przenikanie przez krycie); dokładny wynik daje „Podgląd renderu”.
- **Biblioteka muzyki** to pliki użytkownika z polem licencji + opcjonalny katalog — integracja z dostawcą licencjonowanej muzyki (API) do dodania.
- **Wieloosobowe zespoły** (role, współdzielenie klientów) i płatności — poza zakresem tej wersji.
- Dashboard nie ma jeszcze wykresów trendów ocen w czasie.

Fonty napisów: SIL Open Font License (`public/fonts/LICENSE-OFL.txt`).
