// Generatory szablonowe (bez AI) — wyraźnie oznaczane w interfejsie jako „szablon”.
import { SERVICES, MONTAGE_STYLES, type ServiceKey } from "../constants";
import { CAPTION_TEMPLATES, DEFAULT_CTA, HOOK_TEMPLATES, MUSIC_MOODS, SHOT_GUIDES } from "./knowledge";

export interface IdeaParams {
  service: ServiceKey;
  goal: string;
  car?: string | null;
  style: keyof typeof MONTAGE_STYLES;
  durationSec: number;
  footage: "existing" | "new";
  cta?: string | null;
}

export interface Idea {
  title: string;
  hook: string;
  marketingGoal: string;
  durationSec: number;
  scenario: Array<{ from: number; to: number; description: string }>;
  shotList: Array<{ shot: string; camera: string; duration: string }>;
  captions: string[];
  cameraMovement: string;
  music: string;
  editStyle: string;
  requiresNewFootage: boolean;
}

interface Format {
  title: (s: string, car: string) => string;
  hook: (s: ServiceKey) => string;
  goal: string;
  beats: Array<{ share: number; text: (s: ServiceKey) => string }>;
  camera: string;
  edit: string;
  mood: string;
}

const svc = (s: ServiceKey) => SERVICES[s].toLowerCase();
const hookOf = (s: ServiceKey, t: "wow" | "problem" | "curiosity" | "premium" | "educational") => HOOK_TEMPLATES[s].find((h) => h.type === t)?.text ?? HOOK_TEMPLATES.other[0].text;

const FORMATS: Format[] = [
  {
    title: () => "Czy ten lakier naprawdę był czysty?",
    hook: () => "Na pierwszy rzut oka wyglądał idealnie.",
    goal: "Zaciekawienie i edukacja — pokazanie ukrytego problemu",
    beats: [
      { share: 0.13, text: () => "Gotowy samochód — wygląda idealnie" },
      { share: 0.2, text: () => "Lampa inspekcyjna odsłania mikrorysy / zabrudzenia" },
      { share: 0.27, text: (s) => `Proces: ${svc(s)}` },
      { share: 0.25, text: () => "Rezultat pod tą samą lampą" },
      { share: 0.15, text: () => "CTA" },
    ],
    camera: "Najazdy na lampę inspekcyjną, makro powierzchni, płynny przejazd na końcu",
    edit: "Przed i po",
    mood: "dark_automotive",
  },
  {
    title: (s) => `${SERVICES[s as ServiceKey] ?? s} w 15 sekund`,
    hook: (s) => hookOf(s, "wow"),
    goal: "Zasięg — szybki, satysfakcjonujący przegląd procesu",
    beats: [
      { share: 0.12, text: () => "Najlepsze ujęcie efektu (hook)" },
      { share: 0.6, text: (s) => `Szybki montaż etapów: ${svc(s)} (cięcia na beat)` },
      { share: 0.18, text: () => "Finałowy obrót wokół auta" },
      { share: 0.1, text: () => "CTA" },
    ],
    camera: "Krótkie ujęcia 1–2 s z różnych kątów, makro + szerokie plany",
    edit: "Dynamiczny / TikTok",
    mood: "energetic_electronic",
  },
  {
    title: () => "Błąd, który popełnia większość kierowców",
    hook: (s) => hookOf(s, "educational"),
    goal: "Edukacja i budowanie eksperckiego wizerunku",
    beats: [
      { share: 0.15, text: () => "Pytanie/teza na ekranie + problem w kadrze" },
      { share: 0.3, text: () => "Dlaczego to problem — zbliżenie na skutki" },
      { share: 0.35, text: (s) => `Jak robimy to poprawnie: ${svc(s)}` },
      { share: 0.2, text: () => "Efekt + zaproszenie do kontaktu" },
    ],
    camera: "Statyczne, czytelne kadry pod napisy, makro detali",
    edit: "Educational",
    mood: "minimal_house",
  },
  {
    title: (_s, car) => `${car || "To auto"} po wizycie w studiu`,
    hook: (s) => hookOf(s, "premium"),
    goal: "Prestiż marki — portfolio dla klientów premium",
    beats: [
      { share: 0.2, text: () => "Powolny przejazd wzdłuż karoserii" },
      { share: 0.3, text: () => "Detale: odbicia, felgi, emblematy" },
      { share: 0.3, text: (s) => `Elegancki skrót procesu: ${svc(s)}` },
      { share: 0.2, text: () => "Finał w świetle studia + logo" },
    ],
    camera: "Gimbal, wolne ruchy, niski kąt, światło liniowe",
    edit: "Premium / Cinematic",
    mood: "luxury_cinematic",
  },
  {
    title: () => "Przed / po bez filtrów",
    hook: () => "Ta sama lampa. To samo auto.",
    goal: "Pokazanie efektu przed i po",
    beats: [
      { share: 0.35, text: () => "Stan przed (te same kadry, które powtórzysz po)" },
      { share: 0.15, text: () => "Szybki przebitek procesu" },
      { share: 0.5, text: () => "Stan po — identyczne ujęcia (przejście przez czerń)" },
    ],
    camera: "Statyw ustawiony identycznie przed i po (zaznacz pozycję taśmą)",
    edit: "Przed i po",
    mood: "hiphop_instrumental",
  },
  {
    title: () => "Dzień w studiu detailingowym",
    hook: (s) => hookOf(s, "curiosity"),
    goal: "Zaangażowanie — kulisy i ludzie marki",
    beats: [
      { share: 0.15, text: () => "Otwarcie bramy / przyjazd auta" },
      { share: 0.55, text: () => "Detailer przy pracy — kolejne etapy" },
      { share: 0.2, text: () => "Odbiór auta, reakcja (za zgodą klienta)" },
      { share: 0.1, text: () => "CTA" },
    ],
    camera: "Zza ramienia, POV, ujęcia z ręki",
    edit: "Zrównoważony",
    mood: "minimal_house",
  },
  {
    title: () => "3 rzeczy, których nie widać na pierwszy rzut oka",
    hook: () => "Te trzy detale robią różnicę.",
    goal: "Edukacja + pokazanie dokładności",
    beats: [
      { share: 0.12, text: () => "Zapowiedź: 3 detale" },
      { share: 0.25, text: () => "Detal 1 — makro" },
      { share: 0.25, text: () => "Detal 2 — makro" },
      { share: 0.25, text: () => "Detal 3 — makro" },
      { share: 0.13, text: () => "Całe auto + CTA" },
    ],
    camera: "Makro, najazdy, lampa punktowa",
    edit: "Educational",
    mood: "minimal_house",
  },
  {
    title: () => "Satysfakcjonujące ujęcia (ASMR detailing)",
    hook: (s) => hookOf(s, "wow"),
    goal: "Zasięg — oglądanie do końca, zapętlenia",
    beats: [
      { share: 0.25, text: () => "Piana / rakla / pad w makro" },
      { share: 0.25, text: () => "Spływająca woda, krople" },
      { share: 0.3, text: () => "Polerowanie / aplikacja w zwolnionym tempie" },
      { share: 0.2, text: () => "Efekt końcowy — pętla do pierwszego ujęcia" },
    ],
    camera: "Makro, slow motion 50/60 kl./s, statyw",
    edit: "Minimalistyczny",
    mood: "ambient_premium",
  },
  {
    title: () => "Pytanie od klienta",
    hook: () => "Często pytacie: czy to naprawdę ma sens?",
    goal: "Odpowiedź na obiekcję klienta, wiadomości od klientów",
    beats: [
      { share: 0.15, text: () => "Pytanie na ekranie" },
      { share: 0.5, text: (s) => `Pokazanie usługi (${svc(s)}) z krótkim wyjaśnieniem` },
      { share: 0.2, text: () => "Efekt" },
      { share: 0.15, text: () => "Zaproszenie do pytań w wiadomości" },
    ],
    camera: "Mieszane: twarz eksperta (opcjonalnie) + ujęcia procesu",
    edit: "Reklamowy / Sprzedażowy",
    mood: "minimal_house",
  },
  {
    title: () => "Od zabrudzeń do połysku",
    hook: (s) => hookOf(s, "problem"),
    goal: "Pozyskanie klientów — problem → rozwiązanie",
    beats: [
      { share: 0.18, text: () => "Problem w zbliżeniu" },
      { share: 0.37, text: (s) => `Proces: ${svc(s)}` },
      { share: 0.3, text: () => "Rezultat + korzyść na ekranie" },
      { share: 0.15, text: () => "CTA z telefonem / „Umów termin”" },
    ],
    camera: "Zbliżenia problemu, ujęcia procesu, przejazd po efekcie",
    edit: "Reklamowy / Sprzedażowy",
    mood: "hiphop_instrumental",
  },
  {
    title: () => "Ten detal zdradza jakość",
    hook: () => "Spójrz na krawędzie.",
    goal: "Budowanie zaufania — dowód precyzji",
    beats: [
      { share: 0.2, text: () => "Makro krawędzi / przeszyć / szczelin" },
      { share: 0.45, text: () => "Jak to wykonujemy — precyzja w ruchu" },
      { share: 0.35, text: () => "Całe auto + logo" },
    ],
    camera: "Makro, lampa punktowa, statyw",
    edit: "Premium / Cinematic",
    mood: "luxury_cinematic",
  },
];

export function ideasFromTemplates(p: IdeaParams): Idea[] {
  const guides = SHOT_GUIDES[p.service] ?? SHOT_GUIDES.other;
  const tmpl = CAPTION_TEMPLATES[p.service] ?? CAPTION_TEMPLATES.other;
  const cta = p.cta?.trim() || DEFAULT_CTA[0];
  return FORMATS.map((f) => {
    let t = 0;
    const scenario = f.beats.map((b) => {
      const from = Math.round(t * 10) / 10;
      t += b.share * p.durationSec;
      return { from, to: Math.round(t * 10) / 10, description: b.text(p.service) };
    });
    const mood = MUSIC_MOODS.find((m) => m.key === f.mood)!;
    return {
      title: f.title(p.service, p.car ?? ""),
      hook: f.hook(p.service),
      marketingGoal: f.goal,
      durationSec: p.durationSec,
      scenario,
      shotList: guides.slice(0, 5).map((g) => ({ shot: g.name, camera: `${g.angle} ${g.movement}`, duration: g.sourceLength })),
      captions: [tmpl.hook[0], tmpl.process[0], tmpl.result[0], cta],
      cameraMovement: f.camera,
      music: `${mood.label} (${mood.bpm[0]}–${mood.bpm[1]} BPM)`,
      editStyle: f.edit,
      requiresNewFootage: p.footage === "new",
    };
  });
}

export function postCopyFromTemplate(p: { service: ServiceKey; clientName?: string | null; cta?: string | null; location?: string | null; instagram?: string | null }) {
  const s = SERVICES[p.service] ?? "Detailing";
  const tmpl = CAPTION_TEMPLATES[p.service] ?? CAPTION_TEMPLATES.other;
  const cta = p.cta?.trim() || DEFAULT_CTA[0];
  const tags: Record<ServiceKey, string[]> = {
    ceramic: ["powlokaceramiczna", "ceramika", "ochronalakieru", "hydrofobowosc"],
    correction: ["korektalakieru", "polerowanie", "swirle", "polysk"],
    ppf: ["foliappf", "ppf", "ochronalakieru", "paintprotectionfilm"],
    interior: ["detailingwnetrza", "pranietapicerki", "czystewnetrze", "interiordetailing"],
    wash: ["myciedetailingowe", "bezpiecznemycie", "pianaaktywna", "carwash"],
    other: ["autodetailing", "pielegnacjaauta"],
  };
  return {
    instagram: `${tmpl.hook[0]}\n\n${s} wykonana krok po kroku${p.clientName ? ` w ${p.clientName}` : ""}. ${tmpl.result[0]}.\n\n${cta}${p.instagram ? ` · ${p.instagram}` : ""}`,
    cta,
    hashtags: [...tags[p.service], "detailing", "cardetailing", "detailingpolska", "autodetailing", "carcare"],
    tiktok: `${tmpl.hook[0]} ${tmpl.result[0]}. ${cta}`,
  };
}
