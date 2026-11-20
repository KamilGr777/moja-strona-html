// Baza wiedzy montażysty i marketera automotive. Używana:
//  • w trybie heurystycznym (bez AI) — jako szablony wyraźnie oznaczone w UI,
//  • jako kontekst dla modelu AI (żeby rekomendacje były osadzone w praktyce branży).
// Treści nie zawierają cen, promocji ani obietnic skuteczności.

import type { ServiceKey, ShotCategory, MontageStyle } from "../constants";

export interface ShotGuide {
  key: string;
  name: string;
  what: string;
  angle: string;
  movement: string;
  sourceLength: string;
  editLength: string;
  lighting: string;
  placement: string;
  why: string;
  /** Kategorie wykrytych ujęć, które „pokrywają” tę pozycję */
  covers: ShotCategory[];
}

const common = {
  reveal: {
    key: "reveal",
    name: "Finalny obrót / przejazd wokół auta",
    what: "Gotowy samochód w całości — płynny przejazd kamerą wzdłuż karoserii albo półobrót wokół auta.",
    angle: "Na wysokości reflektorów lub nieco niżej (ok. 60–80 cm), auto pod kątem 3/4.",
    movement: "Powolny, stabilny ruch boczny (gimbal) lub orbita 90–180°.",
    sourceLength: "8–12 s materiału",
    editLength: "1,5–3 s",
    lighting: "Rozproszone światło studyjne lub złota godzina; unikaj ostrego słońca w południe.",
    placement: "Hook (pierwsza sekunda) i finał przed CTA.",
    why: "Pokazuje efekt końcowy całego auta — najmocniejszy argument sprzedażowy usługi.",
    covers: ["result", "reveal"] as ShotCategory[],
  },
  worker: {
    key: "worker",
    name: "Detailer przy pracy",
    what: "Ręce detailera i narzędzie w kadrze — skupienie, precyzja, profesjonalny sprzęt.",
    angle: "Zza ramienia lub z boku, na wysokości pracy.",
    movement: "Statyw albo bardzo powolny najazd.",
    sourceLength: "6–10 s",
    editLength: "1–2 s",
    lighting: "Światło robocze + kontra z boku, by podkreślić fakturę.",
    placement: "Środek rolki (proces).",
    why: "Buduje zaufanie — widz widzi, kto i jak wykonuje usługę.",
    covers: ["worker", "polishing", "coating", "ppf"] as ShotCategory[],
  },
  wheels: {
    key: "wheels",
    name: "Zbliżenie na felgi",
    what: "Czysta, błyszcząca felga i opona po dressingu.",
    angle: "Nisko, na wysokości osi koła, pod kątem 30°.",
    movement: "Powolny najazd lub ruch boczny.",
    sourceLength: "5–8 s",
    editLength: "1–1,5 s",
    lighting: "Boczne światło podkreślające połysk.",
    placement: "Sekwencja detali przed finałem.",
    why: "Detale świadczą o kompleksowości usługi.",
    covers: ["wheels", "detail"] as ShotCategory[],
  },
};

export const SHOT_GUIDES: Record<ServiceKey, ShotGuide[]> = {
  ceramic: [
    {
      key: "apply",
      name: "Makro aplikacji powłoki",
      what: "Aplikator z powłoką przesuwany po lakierze — widoczna „tęczowa” warstwa produktu.",
      angle: "Makro, 20–40 cm od powierzchni, pod kątem ok. 30°.",
      movement: "Statyw lub minimalny ruch równoległy do aplikatora.",
      sourceLength: "6–10 s",
      editLength: "1,5–2 s",
      lighting: "Lampa inspekcyjna z boku — produkt jest widoczny tylko w odbiciu światła.",
      placement: "Proces (środek rolki).",
      why: "Pokazuje, że powłoka to precyzyjny proces, a nie „wosk z myjni”.",
      covers: ["coating"],
    },
    {
      key: "reflection",
      name: "Odbicie światła w gotowym lakierze",
      what: "Lustrzane odbicie lamp/sufitu studia w lakierze po aplikacji.",
      angle: "Nisko wzdłuż panelu, tak aby odbicie było ostre.",
      movement: "Powolny ruch boczny — odbicie „przepływa” po karoserii.",
      sourceLength: "6–8 s",
      editLength: "1,5–2 s",
      lighting: "Liniowe lampy LED odbijające się w lakierze.",
      placement: "Hook lub efekt końcowy.",
      why: "Głębia i połysk to najbardziej widoczna korzyść dla klienta.",
      covers: ["result", "detail"],
    },
    {
      key: "water",
      name: "Efekt hydrofobowy",
      what: "Woda zraszana na maskę tworzy krople i spływa z zabezpieczonej powierzchni.",
      angle: "Bliskie ujęcie maski, pod kątem 30–45°.",
      movement: "Delikatny ruch boczny; opcjonalnie slow motion 50/60 kl./s.",
      sourceLength: "5–8 s",
      editLength: "1,5–2 s",
      lighting: "Kontra (światło zza kropli) — krople świecą.",
      placement: "Po procesie, jako dowód działania.",
      why: "Szybko i wizualnie pokazuje właściwość zabezpieczonej powierzchni.",
      covers: ["water"],
    },
    { ...common.reveal },
    { ...common.wheels },
    { ...common.worker },
  ],
  correction: [
    {
      key: "defects",
      name: "Mikrorysy pod lampą (stan przed)",
      what: "Hologramy i swirle widoczne w świetle lampy inspekcyjnej.",
      angle: "Blisko panelu, lampa i kamera pod podobnym kątem.",
      movement: "Powolne przesuwanie lampy po panelu.",
      sourceLength: "6–10 s",
      editLength: "1,5–2,5 s",
      lighting: "Punktowa lampa inspekcyjna (np. światło słoneczne LED).",
      placement: "Problem — pierwsze 2–5 s.",
      why: "Widz musi zobaczyć problem, żeby docenić rozwiązanie.",
      covers: ["before"],
    },
    {
      key: "polish",
      name: "Polerowanie z bliska",
      what: "Polerka na panelu, widoczny pad i ruch maszyny.",
      angle: "Z boku, nisko, pad na pierwszym planie.",
      movement: "Statyw lub powolny najazd; dobre w przyspieszeniu ×1,5.",
      sourceLength: "8–12 s",
      editLength: "1–2 s",
      lighting: "Światło robocze + lampa inspekcyjna.",
      placement: "Proces.",
      why: "Dynamiczne ujęcie procesu — buduje rytm rolki.",
      covers: ["polishing"],
    },
    {
      key: "5050",
      name: "Efekt 50/50",
      what: "Panel w połowie po korekcie, w połowie przed — granica widoczna pod lampą.",
      angle: "Prostopadle do granicy oklejenia taśmą.",
      movement: "Przesunięcie lampy przez granicę.",
      sourceLength: "6–8 s",
      editLength: "2–2,5 s",
      lighting: "Lampa inspekcyjna.",
      placement: "Punkt kulminacyjny przed efektem końcowym.",
      why: "Najczytelniejszy dowód różnicy — świetny kandydat na hook.",
      covers: ["before", "detail", "polishing"],
    },
    {
      key: "gloss",
      name: "Odbicie w lakierze po korekcie",
      what: "Lustrzany połysk, ostre odbicia otoczenia.",
      angle: "Nisko wzdłuż panelu.",
      movement: "Powolny ruch boczny.",
      sourceLength: "6–8 s",
      editLength: "1,5–2 s",
      lighting: "Liniowe lampy LED.",
      placement: "Hook lub finał.",
      why: "Pokazuje głębię koloru odzyskaną po korekcie.",
      covers: ["result", "detail"],
    },
    { ...common.reveal },
    { ...common.worker },
  ],
  ppf: [
    {
      key: "spray",
      name: "Zraszanie i nakładanie folii",
      what: "Płyn montażowy, folia kładziona na panel.",
      angle: "Z boku panelu, półzbliżenie.",
      movement: "Statyw lub powolny najazd.",
      sourceLength: "8–10 s",
      editLength: "1,5–2 s",
      lighting: "Rozproszone światło studia.",
      placement: "Proces.",
      why: "Pokazuje rzemiosło i staranność montażu.",
      covers: ["ppf"],
    },
    {
      key: "squeegee",
      name: "Rakla wypychająca płyn",
      what: "Ruch rakli po folii — satysfakcjonujące, rytmiczne ujęcie.",
      angle: "Makro, blisko krawędzi rakli.",
      movement: "Kamera podąża za raklą.",
      sourceLength: "6–8 s",
      editLength: "1–1,5 s",
      lighting: "Światło z boku, by widać było płyn.",
      placement: "Proces — świetne pod beat muzyki.",
      why: "Ujęcia „oddly satisfying” podnoszą zaangażowanie.",
      covers: ["ppf", "detail"],
    },
    {
      key: "edges",
      name: "Zawijanie krawędzi",
      what: "Precyzyjne zawinięcie folii na krawędzi panelu.",
      angle: "Makro.",
      movement: "Statyw.",
      sourceLength: "5–8 s",
      editLength: "1–1,5 s",
      lighting: "Punktowe.",
      placement: "Proces / detale.",
      why: "Krawędzie to dowód jakości montażu PPF.",
      covers: ["ppf", "detail"],
    },
    {
      key: "invisible",
      name: "Niewidoczna folia na gotowym aucie",
      what: "Panel z folią, na którym folii praktycznie nie widać.",
      angle: "Wzdłuż panelu.",
      movement: "Powolny ruch boczny.",
      sourceLength: "6–8 s",
      editLength: "1,5–2 s",
      lighting: "Liniowe lampy LED.",
      placement: "Finał.",
      why: "Klient chce ochrony, która nie zmienia wyglądu auta.",
      covers: ["result", "detail"],
    },
    { ...common.reveal },
    { ...common.worker },
  ],
  interior: [
    {
      key: "before_int",
      name: "Wnętrze przed",
      what: "Zabrudzenia foteli, dywaników, konsoli.",
      angle: "Szeroko z drzwi + zbliżenia na plamy.",
      movement: "Statyw lub powolny najazd.",
      sourceLength: "6–8 s",
      editLength: "1–1,5 s",
      lighting: "Neutralne światło, bez przepaleń.",
      placement: "Początek (problem).",
      why: "Kontrast przed/po to główny argument przy detailingu wnętrza.",
      covers: ["before", "interior"],
    },
    {
      key: "extraction",
      name: "Pranie ekstrakcyjne",
      what: "Brudna woda zasysana przez dyszę odkurzacza piorącego.",
      angle: "Makro dyszy, pod kątem.",
      movement: "Statyw.",
      sourceLength: "6–8 s",
      editLength: "1–1,5 s",
      lighting: "Światło z przodu, by widać kolor wody.",
      placement: "Proces.",
      why: "Bardzo czytelne, angażujące ujęcie procesu.",
      covers: ["upholstery", "interior"],
    },
    {
      key: "brush",
      name: "Pędzel / szczotka w detalach",
      what: "Czyszczenie kratek nawiewu, przeszyć, przełączników.",
      angle: "Makro.",
      movement: "Statyw lub bardzo powolny najazd.",
      sourceLength: "5–8 s",
      editLength: "1 s",
      lighting: "Punktowe światło.",
      placement: "Proces / detale.",
      why: "Pokazuje dokładność.",
      covers: ["interior", "detail"],
    },
    {
      key: "after_int",
      name: "Wnętrze po — szeroki plan",
      what: "Czyste, uporządkowane wnętrze z drzwi kierowcy.",
      angle: "Szeroko, z otwartych drzwi.",
      movement: "Powolny najazd do środka.",
      sourceLength: "6–10 s",
      editLength: "2 s",
      lighting: "Miękkie światło.",
      placement: "Finał.",
      why: "Rezultat, który klient od razu rozumie.",
      covers: ["result", "interior"],
    },
    { ...common.worker },
  ],
  wash: [
    {
      key: "foam",
      name: "Piana aktywna",
      what: "Gęsta piana spływająca po karoserii.",
      angle: "Nisko, z boku auta.",
      movement: "Statyw; dobrze działa slow motion.",
      sourceLength: "8–10 s",
      editLength: "1,5–2 s",
      lighting: "Kontra, by piana była plastyczna.",
      placement: "Początek procesu.",
      why: "Bardzo atrakcyjne wizualnie, rozpoznawalne ujęcie.",
      covers: ["washing"],
    },
    {
      key: "decon",
      name: "Deironizacja / dekontaminacja",
      what: "Fioletowe „krwawienie” preparatu na felgach lub lakierze.",
      angle: "Zbliżenie.",
      movement: "Statyw.",
      sourceLength: "5–8 s",
      editLength: "1,5 s",
      lighting: "Rozproszone.",
      placement: "Proces.",
      why: "Pokazuje głębsze czyszczenie niż zwykła myjnia.",
      covers: ["decon", "wheels"],
    },
    {
      key: "rinse",
      name: "Płukanie i spływająca woda",
      what: "Strumień wody zmywający pianę.",
      angle: "Z boku, nisko.",
      movement: "Powolny ruch boczny.",
      sourceLength: "6–8 s",
      editLength: "1–1,5 s",
      lighting: "Kontra.",
      placement: "Proces.",
      why: "Dynamika i świeżość.",
      covers: ["washing", "water"],
    },
    {
      key: "dry",
      name: "Osuszanie mikrofibrą",
      what: "Miękki ręcznik prowadzony po lakierze.",
      angle: "Półzbliżenie.",
      movement: "Kamera podąża za ręcznikiem.",
      sourceLength: "5–8 s",
      editLength: "1 s",
      lighting: "Rozproszone.",
      placement: "Przed finałem.",
      why: "Bezpieczna metoda — argument dla świadomych klientów.",
      covers: ["washing", "worker"],
    },
    { ...common.reveal },
    { ...common.wheels },
  ],
  other: [{ ...common.reveal }, { ...common.worker }, { ...common.wheels }],
};

export type HookType = "wow" | "problem" | "curiosity" | "premium" | "educational";
export const HOOK_TYPE_LABELS: Record<HookType, string> = {
  wow: "Efekt WOW",
  problem: "Problem → rozwiązanie",
  curiosity: "Ciekawość",
  premium: "Premium / luksus",
  educational: "Edukacyjny",
};

export interface HookTemplate {
  type: HookType;
  text: string;
  shot: string;
  needs: ShotCategory[];
  duration: number;
  textAnimation: string;
  musicIn: string;
  rationale: string;
}

const H = (type: HookType, text: string, shot: string, needs: ShotCategory[], rationale: string, duration = 1.8, textAnimation = "pop", musicIn = "Od pierwszej klatki, mocny akcent na pierwszym cięciu"): HookTemplate => ({
  type, text, shot, needs, duration, textAnimation, musicIn, rationale,
});

export const HOOK_TEMPLATES: Record<ServiceKey, HookTemplate[]> = {
  correction: [
    H("wow", "Ten efekt robi ogromną różnicę.", "Odbicie światła w lakierze po korekcie", ["result", "detail"], "Rezultat w pierwszej sekundzie zatrzymuje kciuk — widz od razu widzi wartość."),
    H("problem", "Myślisz, że ten lakier jest w dobrym stanie?", "Mikrorysy pod lampą inspekcyjną", ["before"], "Pytanie angażuje widza i zapowiada rozwiązanie problemu, który może mieć jego auto.", 2.2, "fade"),
    H("curiosity", "Zobacz, co kryje się pod tymi rysami.", "Efekt 50/50 pod lampą", ["before", "polishing"], "Niedopowiedzenie buduje ciekawość i zatrzymuje do końca."),
    H("premium", "Tak wygląda lakier po profesjonalnej korekcie.", "Powolny przejazd wzdłuż karoserii", ["result", "reveal"], "Spokojny, luksusowy początek pozycjonuje usługę premium.", 2.4, "fade", "Spokojne wejście, podbicie przy pierwszym detalu"),
    H("educational", "Nie każde mycie usunie takie ślady.", "Swirle w świetle lampy", ["before"], "Edukuje i obala mit, że wystarczy myjnia — naturalnie prowadzi do usługi.", 2.2, "slide-up"),
  ],
  ceramic: [
    H("wow", "Zobacz efekt hydrofobowy z bliska.", "Krople wody spływające z maski", ["water"], "Krople i spływająca woda to natychmiastowy, wizualny dowód działania."),
    H("problem", "Lakier matowieje po każdym sezonie?", "Matowy lakier przed zabezpieczeniem", ["before"], "Nazwany problem trafia do właścicieli, którzy go znają.", 2.2, "fade"),
    H("curiosity", "Co daje profesjonalna ochrona lakieru?", "Makro aplikacji powłoki", ["coating"], "Pytanie otwarte zachęca do obejrzenia do końca.", 2, "slide-up"),
    H("premium", "Ochrona, którą widać.", "Odbicie światła w lakierze", ["result", "detail"], "Krótkie, eleganckie hasło + piękny kadr = prestiż marki.", 2, "fade", "Delikatne wejście, mocniejszy akcent przy pokazaniu połysku"),
    H("educational", "Dlaczego właściciele nowych aut zabezpieczają lakier?", "Nowe auto w studiu", ["result", "studio"], "Edukacja buduje zaufanie i trafia do klientów kupujących nowe auta.", 2.4, "slide-up"),
  ],
  ppf: [
    H("wow", "Ta folia jest na aucie. Widzisz ją?", "Niewidoczna folia na panelu", ["result", "detail"], "Zaskoczenie — widz szuka folii i ogląda dłużej."),
    H("problem", "Odpryski na masce po pierwszej trasie?", "Zbliżenie odprysków / przód auta", ["before", "detail"], "Konkretny problem użytkownika = wysoka trafność.", 2.2, "fade"),
    H("curiosity", "Tak montujemy folię na krawędziach.", "Makro zawijania krawędzi", ["ppf", "detail"], "Proces z bliska jest „oddly satisfying”.", 2, "slide-up"),
    H("premium", "Niewidzialna ochrona dla wyjątkowego auta.", "Przejazd wzdłuż karoserii", ["result", "reveal"], "Pozycjonowanie premium dla właścicieli drogich aut.", 2.4, "fade", "Spokojne wejście, akcent przy reveal"),
    H("educational", "Co tak naprawdę chroni folia PPF?", "Rakla na folii", ["ppf"], "Wyjaśnia korzyść i odróżnia usługę od zwykłego oklejania.", 2.2, "slide-up"),
  ],
  interior: [
    H("wow", "Różnica, którą czuć po otwarciu drzwi.", "Szeroki plan czystego wnętrza", ["result", "interior"], "Efekt końcowy od razu pokazuje wartość."),
    H("problem", "Plamy na fotelach, które nie schodzą?", "Zbliżenie zabrudzonej tapicerki", ["before", "upholstery"], "Problem, który zna większość kierowców.", 2.2, "fade"),
    H("curiosity", "Zobacz, co wyciągnęliśmy z tego fotela.", "Brudna woda w dyszy ekstraktora", ["upholstery"], "Szokujący kolor wody przyciąga uwagę.", 2, "pop"),
    H("premium", "Wnętrze jak w dniu odbioru z salonu.", "Powolny najazd do wnętrza", ["result", "interior"], "Odwołanie do emocji nowego auta.", 2.4, "fade", "Spokojne wejście"),
    H("educational", "Tak czyścimy miejsca, do których nie sięga odkurzacz.", "Pędzel w kratce nawiewu", ["interior", "detail"], "Pokazuje dokładność i wiedzę studia.", 2.2, "slide-up"),
  ],
  wash: [
    H("wow", "Ta piana robi robotę.", "Gęsta piana aktywna na aucie", ["washing"], "Mocny wizualnie kadr na start."),
    H("problem", "Myjnia automatyczna niszczy lakier?", "Swirle / zabrudzony lakier", ["before"], "Kontrowersyjne pytanie zatrzymuje widza.", 2.2, "fade"),
    H("curiosity", "Zobacz, co zostaje na felgach po zwykłym myciu.", "Deironizacja na feldze", ["decon", "wheels"], "Fioletowy preparat zaskakuje i ciekawi.", 2, "pop"),
    H("premium", "Mycie detailingowe. Bez kompromisów.", "Płukanie w kontrze", ["washing", "water"], "Krótko i pewnie — pozycjonuje jakość.", 2, "fade"),
    H("educational", "Tak wygląda bezpieczne mycie auta.", "Osuszanie mikrofibrą", ["washing"], "Edukuje świadomych klientów.", 2.2, "slide-up"),
  ],
  other: [
    H("wow", "Efekt, który mówi sam za siebie.", "Najlepsze ujęcie gotowego auta", ["result"], "Rezultat na start to najbezpieczniejszy hook."),
    H("problem", "Twoje auto zasługuje na więcej?", "Stan przed", ["before"], "Bezpośrednie pytanie do właściciela auta.", 2.2, "fade"),
    H("curiosity", "Zobacz, jak to wygląda od kuchni.", "Detailer przy pracy", ["worker"], "Kulisy pracy budują ciekawość.", 2, "slide-up"),
    H("premium", "Precyzja w każdym detalu.", "Makro detalu", ["detail"], "Elegancki, premium początek.", 2, "fade"),
    H("educational", "Na tym polega profesjonalny detailing.", "Proces z bliska", ["worker", "polishing"], "Edukacja zamiast sprzedaży wprost.", 2.2, "slide-up"),
  ],
};

/** Szablony napisów marketingowych (bez obietnic, cen i promocji). */
export const CAPTION_TEMPLATES: Record<ServiceKey, { hook: string[]; process: string[]; result: string[]; benefit: string[] }> = {
  correction: {
    hook: ["Lakier pełen mikrorys?", "Zobacz różnicę", "Ten lakier odzyskał głębię koloru"],
    process: ["Precyzyjna korekta lakieru", "Etap po etapie", "Usuwamy hologramy i swirle"],
    result: ["Przywracamy mu blask", "Głębia koloru", "Lustrzany połysk"],
    benefit: ["Zadbaj o swoje auto", "Lakier jak nowy"],
  },
  ceramic: {
    hook: ["Ochrona, którą widać", "Zobacz efekt hydrofobowy", "Lakier pod ochroną"],
    process: ["Aplikacja powłoki ceramicznej", "Precyzyjnie, warstwa po warstwie", "Przygotowanie to podstawa"],
    result: ["Głęboki połysk", "Woda spływa sama", "Gotowe"],
    benefit: ["Łatwiejsze mycie", "Zadbaj o swoje auto"],
  },
  ppf: {
    hook: ["Niewidzialna ochrona", "Widzisz tę folię?", "Ochrona przed odpryskami"],
    process: ["Precyzyjny montaż folii PPF", "Dopracowane krawędzie", "Każdy panel osobno"],
    result: ["Lakier pod ochroną", "Niewidoczna na aucie", "Gotowe"],
    benefit: ["Spokój na trasie", "Zadbaj o swoje auto"],
  },
  interior: {
    hook: ["Wnętrze do odświeżenia?", "Zobacz tę różnicę", "Plamy, które nie schodzą?"],
    process: ["Pranie tapicerki", "Czyszczenie detali", "Dokładnie, krok po kroku"],
    result: ["Świeże wnętrze", "Jak z salonu", "Gotowe"],
    benefit: ["Komfort każdej jazdy", "Zadbaj o swoje auto"],
  },
  wash: {
    hook: ["To nie jest zwykła myjnia", "Bezpieczne mycie", "Zobacz tę pianę"],
    process: ["Mycie detailingowe", "Dekontaminacja", "Bez rys i hologramów"],
    result: ["Czysto do ostatniego detalu", "Blask", "Gotowe"],
    benefit: ["Zadbaj o swoje auto", "Lakier bezpieczny przy każdym myciu"],
  },
  other: {
    hook: ["Zobacz efekt", "Detailing na najwyższym poziomie", "Precyzja w każdym detalu"],
    process: ["Etap po etapie", "Profesjonalny proces", "Dbałość o detale"],
    result: ["Efekt końcowy", "Gotowe", "Blask"],
    benefit: ["Zadbaj o swoje auto"],
  },
};

export const DEFAULT_CTA = ["Umów termin już dziś", "Napisz do nas", "Zarezerwuj termin", "Link w bio"];

export const CTA_KEYWORDS = [
  "umów", "umow", "zadzwoń", "zadzwon", "napisz", "rezerw", "zarezerwuj", "link w bio", "kontakt", "wiadomość", "wiadomosc",
  "dm", "zapraszamy", "zapisz", "zapytaj", "konsultac", "termin", "sprawdź", "sprawdz", "odwiedź", "odwiedz", "telefon",
];

export interface MusicMood {
  key: string;
  label: string;
  bpm: [number, number];
  description: string;
}

export const MUSIC_MOODS: MusicMood[] = [
  { key: "luxury_cinematic", label: "Luxury cinematic", bpm: [70, 95], description: "Orkiestrowe pady, szerokie przestrzenie, powolne narastanie." },
  { key: "dark_automotive", label: "Dark automotive", bpm: [85, 110], description: "Ciemny bas, syntezatory, napięcie — dobrze pod nocne, kontrastowe ujęcia." },
  { key: "energetic_electronic", label: "Energetic electronic", bpm: [120, 132], description: "Wyraźny beat 4/4 — szybkie cięcia na każdy beat." },
  { key: "minimal_house", label: "Minimal house", bpm: [118, 125], description: "Minimalistyczny groove, nowoczesny i czysty klimat." },
  { key: "hiphop_instrumental", label: "Modern hip-hop instrumental", bpm: [85, 100], description: "Mocny bęben, cięcia na werbel — dynamika bez chaosu." },
  { key: "ambient_premium", label: "Ambient premium", bpm: [60, 80], description: "Spokojne tło dla eleganckich, wolnych ujęć." },
];

export const STYLE_MUSIC: Record<MontageStyle, string> = {
  viral: "energetic_electronic",
  premium: "luxury_cinematic",
  sales: "minimal_house",
  minimal: "ambient_premium",
  before_after: "hiphop_instrumental",
  educational: "minimal_house",
};

/** Rekomendowana długość wg celu (s). */
export const GOAL_LENGTH: Record<string, [number, number]> = {
  leads: [15, 25],
  service: [15, 25],
  prestige: [18, 30],
  engagement: [10, 18],
  before_after: [10, 20],
  education: [25, 40],
  promo: [12, 20],
};
