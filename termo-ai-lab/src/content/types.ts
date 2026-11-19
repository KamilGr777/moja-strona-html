/**
 * Typy treści edukacyjnych.
 * Treści (lekcje, zadania, rubryki, sprawdziany, biblioteka) są oddzielone od komponentów
 * interfejsu — aby dodać lekcję, wystarczy dopisać obiekt w katalogu src/content.
 */

export type LevelId = 'poczatkujacy' | 'sredni' | 'zaawansowany';

/** Umiejętności, których postęp śledzi aplikacja. */
export type SkillId =
  | 'cel'
  | 'kontekst'
  | 'dane'
  | 'format'
  | 'ograniczenia'
  | 'weryfikacja'
  | 'bezpieczenstwo'
  | 'iteracja'
  | 'struktura';

export type IconName =
  | 'target'
  | 'info'
  | 'database'
  | 'layout'
  | 'shield'
  | 'check'
  | 'alert'
  | 'message'
  | 'sparkles'
  | 'lightbulb'
  | 'users'
  | 'file'
  | 'chart'
  | 'clock'
  | 'list'
  | 'repeat'
  | 'lock'
  | 'eye'
  | 'wrench'
  | 'flame'
  | 'brain'
  | 'route'
  | 'bot'
  | 'book'
  | 'scale';

/* ------------------------------------------------------------------ */
/* Rubryki oceny poleceń                                               */
/* ------------------------------------------------------------------ */

/**
 * Prosta heurystyka trybu demonstracyjnego: lista grup sygnałów.
 * Każda grupa to zestaw rdzeni słów (bez polskich znaków, małymi literami, mogą być wyrażeniami regularnymi).
 * Grupa jest „trafiona”, jeśli w poleceniu występuje którykolwiek z jej rdzeni.
 */
export interface DemoCheck {
  groups: string[][];
  /** Ile grup musi zostać trafionych, aby kryterium było spełnione w pełni. */
  full: number;
  /** Ile grup wystarczy do częściowego spełnienia (domyślnie 1). */
  partial?: number;
  /** Dodatkowo wymagaj liczby / daty / godziny w poleceniu (np. termin przerwy). */
  needsNumber?: boolean;
  /** Wzorce, których obecność zeruje kryterium (np. dane osobowe w poleceniu). */
  forbidden?: string[];
}

export interface RubricCriterion {
  id: string;
  skill: SkillId;
  /** Krótka nazwa, np. „Jasny cel”. */
  label: string;
  /** Co w tym zadaniu oznacza spełnienie kryterium. */
  description: string;
  /** Liczba punktów (suma wag w zadaniu = 100). */
  weight: number;
  /** Fraza do zdania „AI nie zna jeszcze …”, np. „odbiorcy komunikatu”. */
  missingPhrase: string;
  /** Wskazówka, jak uzupełnić brak. */
  tip: string;
  /** Pochwała, gdy kryterium jest spełnione. */
  praise: string;
  demo: DemoCheck;
}

export type PromptTaskKind = 'write' | 'fix' | 'data' | 'document' | 'system' | 'chain';

export interface TaskMaterial {
  title: string;
  content: string;
  /** Materiał można skopiować do schowka, aby wkleić go do prawdziwego asystenta AI. */
  copyable?: boolean;
  /** Treść dołączana automatycznie przy uruchomieniu promptu w AI (np. tabela danych). */
  attachToRun?: boolean;
}

export interface PromptTask {
  id: string;
  level: LevelId;
  kind: PromptTaskKind;
  title: string;
  /** Jednozdaniowy opis do list i kart. */
  short: string;
  /** Pełna treść zadania. */
  scenario: string;
  materials?: TaskMaterial[];
  /** Dla zadań typu „Napraw prompt”. */
  brokenPrompt?: string;
  placeholder: string;
  /** Wyjaśnienie zadania prostszymi słowami (Duszek: „Nie rozumiem tego zadania”). */
  simpleExplanation: string;
  /** Kolejne podpowiedzi — nie ujawniają gotowej odpowiedzi. */
  hints: string[];
  criteria: RubricCriterion[];
  examplePrompt: string;
  exampleWhy: string[];
  /** Jak sprawdzić wynik, który zwróci AI. */
  verifyTip: string;
  /** Minimalna sensowna liczba słów. */
  minWords?: number;
  /** Wartości źródłowe do porównania odpowiedzi AI (zadania z danymi). */
  referenceFacts?: ReferenceFact[];
  /** Ćwiczenie celowane na konkretną umiejętność. */
  focusSkill?: SkillId;
}

export interface ReferenceFact {
  label: string;
  /** Wartość do wyszukania w odpowiedzi AI (np. „96”). */
  value: string;
  unit?: string;
  /** Alternatywne zapisy wartości (np. „37,5” i „37.5”). */
  alternatives?: string[];
}

/* ------------------------------------------------------------------ */
/* Kroki lekcji                                                        */
/* ------------------------------------------------------------------ */

export type StageId = 'zobacz' | 'porownaj' | 'sprobuj' | 'feedback' | 'popraw' | 'zapamietaj';

export interface ConceptBlock {
  icon?: IconName;
  title: string;
  text: string;
}

export interface ConceptStep {
  type: 'concept';
  stage: StageId;
  title: string;
  lead?: string;
  blocks: ConceptBlock[];
  callout?: { tone: 'info' | 'warn' | 'heat'; text: string };
}

export interface CompareStep {
  type: 'compare';
  stage: StageId;
  title: string;
  situation: string;
  weak: { prompt: string; result: string; problems: string[] };
  strong: { prompt: string; result: string; strengths: string[] };
  takeaway: string;
}

export interface ChoiceOption {
  id: string;
  text: string;
  correct: boolean;
  explanation: string;
}

export interface ChoiceStep {
  type: 'choice';
  stage: StageId;
  title: string;
  question: string;
  context?: string;
  /** Wyświetlaj opcje jako bloki promptów (czcionka i ramka jak polecenie). */
  promptStyle?: boolean;
  options: ChoiceOption[];
  skill: SkillId;
}

export interface ClassifyStep {
  type: 'classify';
  stage: StageId;
  title: string;
  instruction: string;
  buckets: { id: string; label: string; tone: 'ok' | 'warn' | 'bad' | 'info' }[];
  items: { id: string; text: string; bucket: string; explanation: string }[];
  skill: SkillId;
  /** Błędne przypisanie elementu z tej grupy to błąd krytyczny (np. decyzja człowieka oddana AI). */
  criticalBucket?: string;
}

export interface TrainerStep {
  type: 'trainer';
  stage: StageId;
  taskId: string;
}

export interface FindErrorStep {
  type: 'findError';
  stage: StageId;
  title: string;
  instruction: string;
  source: { title: string; content: string };
  /** Opcjonalny wykres jako źródło (id zestawu danych). */
  chartId?: string;
  answerTitle: string;
  statements: { id: string; text: string; isError: boolean; critical?: boolean; explanation: string }[];
  skill: SkillId;
}

export interface RedactSegment {
  text: string;
  /** Fragment, który można kliknąć. */
  selectable?: boolean;
  sensitive?: boolean;
  category?: string;
  replacement?: string;
}

export interface RedactStep {
  type: 'redact';
  stage: StageId;
  title: string;
  instruction: string;
  segments: RedactSegment[];
  afterword: string;
  skill: SkillId;
}

export interface OrderStep {
  type: 'order';
  stage: StageId;
  title: string;
  instruction: string;
  /** Elementy w POPRAWNEJ kolejności — aplikacja sama je przetasuje. */
  items: { id: string; text: string }[];
  explanation: string;
  skill: SkillId;
}

export interface MatchStep {
  type: 'match';
  stage: StageId;
  title: string;
  instruction: string;
  prompt?: string;
  categories: { id: string; label: string }[];
  items: { id: string; text: string; category: string; explanation: string }[];
  skill: SkillId;
}

export interface ChatChoice {
  text: string;
  next: string;
  good: boolean;
  feedback: string;
}

export interface ChatNode {
  ai: string;
  choices?: ChatChoice[];
  end?: boolean;
}

export interface ChatStep {
  type: 'chat';
  stage: StageId;
  title: string;
  instruction: string;
  firstMessage: string;
  start: string;
  nodes: Record<string, ChatNode>;
  outro: string;
  skill: SkillId;
}

export interface ChartStep {
  type: 'chart';
  stage: StageId;
  title: string;
  instruction: string;
  chartId: string;
  questions: QuizQuestion[];
}

export interface ToolsStep {
  type: 'tools';
  stage: StageId;
  title: string;
  lead: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  context?: string;
  options: ChoiceOption[];
  skill: SkillId;
  /** Błędna odpowiedź oznacza istotny błąd bezpieczeństwa lub weryfikacji. */
  critical?: boolean;
}

export interface QuizStep {
  type: 'quiz';
  stage: StageId;
  title: string;
  questions: QuizQuestion[];
}

export interface RememberStep {
  type: 'remember';
  stage: StageId;
  rule: string;
  details: string[];
  /** Jak wykorzystać to jutro w pracy. */
  tryAtWork: string;
}

export interface BuilderStep {
  type: 'builder';
  stage: StageId;
  title: string;
  instruction: string;
  /** Sekcje do uzupełnienia: każda ma opcje do wyboru (jedna najlepsza). */
  sections: {
    id: string;
    label: string;
    options: { id: string; text: string; best: boolean; feedback: string }[];
  }[];
  skill: SkillId;
}

export type LessonStep =
  | ConceptStep
  | CompareStep
  | ChoiceStep
  | ClassifyStep
  | TrainerStep
  | FindErrorStep
  | RedactStep
  | OrderStep
  | MatchStep
  | ChatStep
  | ChartStep
  | ToolsStep
  | QuizStep
  | RememberStep
  | BuilderStep;

export interface Lesson {
  id: string;
  level: LevelId;
  moduleId: string;
  number: number;
  title: string;
  subtitle: string;
  minutes: number;
  icon: IconName;
  /** Czego użytkownik się nauczy (pokazywane przed i po lekcji). */
  outcomes: string[];
  skills: SkillId[];
  steps: LessonStep[];
}

export interface CurriculumModule {
  id: string;
  level: LevelId;
  number: number;
  title: string;
  description: string;
  /** Lekcje dostępne w tej wersji (puste = moduł zaplanowany). */
  lessonIds: string[];
}

export interface LevelInfo {
  id: LevelId;
  name: string;
  short: string;
  subtitle: string;
  audience: string;
  goal: string;
  icon: IconName;
  color: string;
  colorSoft: string;
  next?: LevelId;
}

/* ------------------------------------------------------------------ */
/* Wyniki ćwiczeń                                                      */
/* ------------------------------------------------------------------ */

export interface ExerciseResult {
  /** 0–100 */
  score: number;
  /** Istotny błąd bezpieczeństwa / weryfikacji. */
  criticalMiss?: boolean;
  /** Wyniki cząstkowe dla umiejętności (0–100). */
  skills: Partial<Record<SkillId, number>>;
  /** Szczegóły do podsumowania (np. przeoczone błędy). */
  notes?: string[];
}
