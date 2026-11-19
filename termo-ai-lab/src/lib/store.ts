import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { ExerciseResult, LevelId, SkillId } from '../content/types';
import { BADGES, POINTS } from '../content/badges';
import { LESSONS, lessonsForLevel } from '../content/lessons';
import type { AssessmentArea } from '../content/assessments';
import type { CriterionLevel, EvaluationMode } from './scoring';

/* ------------------------------------------------------------------ */
/* Typy zapisu postępu                                                 */
/* ------------------------------------------------------------------ */

export interface LessonProgress {
  stepIndex: number;
  completed: boolean;
  completedAt?: string;
  /** Wyniki ćwiczeń w krokach lekcji (indeks kroku → wynik). */
  results: Record<number, ExerciseResult>;
}

export interface TrainerAttempt {
  taskId: string;
  score: number;
  mode: EvaluationMode;
  context: 'lesson' | 'lab' | 'assessment';
  criteria: { id: string; level: CriterionLevel; skill: SkillId }[];
  at: string;
}

export type ExerciseType = 'findError' | 'redact' | 'order' | 'match' | 'classify' | 'choice' | 'quiz' | 'chat' | 'chart' | 'builder';

export interface ExerciseRecord {
  type: ExerciseType;
  best: number;
  attempts: number;
  lastAt: string;
}

export interface SkillEvent {
  skill: SkillId;
  value: number;
  at: string;
}

export type Recommendation = 'ready' | 'almost' | 'practice';

export interface AssessmentRecord {
  score: number;
  recommendation: Recommendation;
  critical: boolean;
  areas: Partial<Record<AssessmentArea, number>>;
  at: string;
}

export interface Settings {
  motion: 'system' | 'reduce' | 'full';
  largeText: boolean;
}

export interface ProgressState {
  version: 1;
  introSeen: boolean;
  level: LevelId | null;
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  lastLessonId: string | null;
  trainerAttempts: TrainerAttempt[];
  exercises: Record<string, ExerciseRecord>;
  skillEvents: SkillEvent[];
  drafts: Record<string, string>;
  points: number;
  badges: Record<string, string>;
  assessments: Partial<Record<LevelId, AssessmentRecord[]>>;
  placement: { level: LevelId; at: string } | null;
  library: Record<string, { values: Record<string, string>; customText?: string }>;
  ghostIntroShown: boolean;
  /** Nowo zdobyte odznaki do pokazania (nie są trwale zapisywane). */
  newBadges: string[];
  /** Ostatnio przyznane punkty (do krótkiego komunikatu). */
  lastPoints: number;
}

interface Actions {
  completeIntro: () => void;
  setLevel: (level: LevelId) => void;
  setSettings: (s: Partial<Settings>) => void;
  setLessonStep: (lessonId: string, stepIndex: number) => void;
  recordStepResult: (lessonId: string, stepIndex: number, key: string, type: ExerciseType, result: ExerciseResult) => void;
  completeLesson: (lessonId: string) => number;
  recordTrainerAttempt: (a: Omit<TrainerAttempt, 'at'>) => { improvement: number | null; pointsAwarded: number };
  recordExercise: (key: string, type: ExerciseType, result: ExerciseResult) => void;
  saveDraft: (taskId: string, text: string) => void;
  recordAssessment: (level: LevelId, record: Omit<AssessmentRecord, 'at'>) => void;
  setPlacement: (level: LevelId) => void;
  saveLibraryValues: (id: string, values: Record<string, string>) => void;
  saveLibraryCustom: (id: string, text: string | undefined) => void;
  markGhostIntroShown: () => void;
  consumeNewBadges: () => string[];
  resetProgress: () => void;
}

export type Store = ProgressState & Actions;

const now = () => new Date().toISOString();

export const initialProgress: ProgressState = {
  version: 1,
  introSeen: false,
  level: null,
  settings: { motion: 'system', largeText: false },
  lessons: {},
  lastLessonId: null,
  trainerAttempts: [],
  exercises: {},
  skillEvents: [],
  drafts: {},
  points: 0,
  badges: {},
  assessments: {},
  placement: null,
  library: {},
  ghostIntroShown: false,
  newBadges: [],
  lastPoints: 0,
};

/* ------------------------------------------------------------------ */
/* Odznaki                                                              */
/* ------------------------------------------------------------------ */

function earnedBadges(s: ProgressState, extra: { improved20?: boolean } = {}): string[] {
  const earned: string[] = [];
  const completed = (id: string) => !!s.lessons[id]?.completed;
  const levelDone = (level: LevelId) => lessonsForLevel(level).every((l) => completed(l.id));
  const exerciseBest = (type: ExerciseType) => Object.values(s.exercises).some((e) => e.type === type && e.best >= 100);

  if (s.trainerAttempts.length > 0) earned.push('pierwszy-prompt');
  if (LESSONS.some((l) => completed(l.id))) earned.push('odkrywca');
  if (extra.improved20) earned.push('krok-po-kroku');
  if (s.trainerAttempts.some((a) => a.score >= 90)) earned.push('mistrz-precyzji');
  if (exerciseBest('findError')) earned.push('lowca-bledow');
  if (exerciseBest('redact')) earned.push('straznik-danych');
  if (completed('s-wykresy')) earned.push('analityk');
  if (completed('z-wieloetapowe')) earned.push('architekt');
  if (levelDone('poczatkujacy')) earned.push('absolwent-1');
  if (levelDone('sredni')) earned.push('absolwent-2');
  if (levelDone('zaawansowany')) earned.push('absolwent-3');
  if (Object.values(s.assessments).some((list) => list?.some((r) => r.recommendation === 'ready'))) earned.push('ekspert-komunikacji');
  return earned.filter((id) => BADGES.some((b) => b.id === id));
}

function withBadges(s: ProgressState, extra?: { improved20?: boolean }): Pick<ProgressState, 'badges' | 'newBadges'> {
  const earned = earnedBadges(s, extra).filter((id) => !s.badges[id]);
  if (earned.length === 0) return { badges: s.badges, newBadges: s.newBadges };
  const badges = { ...s.badges };
  for (const id of earned) badges[id] = now();
  return { badges, newBadges: [...s.newBadges, ...earned] };
}

function addSkillEvents(events: SkillEvent[], skills: Partial<Record<SkillId, number>>): SkillEvent[] {
  const at = now();
  const add = Object.entries(skills).map(([skill, value]) => ({ skill: skill as SkillId, value: value as number, at }));
  return [...events, ...add].slice(-400);
}

/* ------------------------------------------------------------------ */
/* Bezpieczny dostęp do localStorage (tryb prywatny, zablokowane dane)  */
/* ------------------------------------------------------------------ */

const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

export const STORAGE_KEY = 'termo-ai-lab:postep';

export const useProgress = create<Store>()(
  persist(
    (set, get) => ({
      ...initialProgress,

      completeIntro: () => set({ introSeen: true }),

      setLevel: (level) => set({ level }),

      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      setLessonStep: (lessonId, stepIndex) => {
        const cur = get().lessons[lessonId] ?? { stepIndex: 0, completed: false, results: {} };
        set({ lessons: { ...get().lessons, [lessonId]: { ...cur, stepIndex } }, lastLessonId: lessonId });
      },

      recordStepResult: (lessonId, stepIndex, key, type, result) => {
        const cur = get().lessons[lessonId] ?? { stepIndex, completed: false, results: {} };
        set({ lessons: { ...get().lessons, [lessonId]: { ...cur, results: { ...cur.results, [stepIndex]: result } } } });
        get().recordExercise(key, type, result);
      },

      completeLesson: (lessonId) => {
        const s = get();
        const cur = s.lessons[lessonId] ?? { stepIndex: 0, completed: false, results: {} };
        const first = !cur.completed;
        const points = first ? POINTS.lessonComplete : 0;
        const next: ProgressState = {
          ...s,
          lessons: { ...s.lessons, [lessonId]: { ...cur, completed: true, completedAt: cur.completedAt ?? now() } },
          points: s.points + points,
          lastPoints: points,
          lastLessonId: lessonId,
        };
        set({ ...next, ...withBadges(next) });
        return points;
      },

      recordTrainerAttempt: (a) => {
        const s = get();
        const previous = [...s.trainerAttempts].reverse().find((x) => x.taskId === a.taskId && x.context === a.context);
        const bestBefore = s.trainerAttempts.filter((x) => x.taskId === a.taskId).reduce((m, x) => Math.max(m, x.score), 0);
        const improvement = previous ? a.score - previous.score : null;
        const pointsAwarded = Math.max(0, Math.floor(a.score / 10) - Math.floor(bestBefore / 10)) * POINTS.trainerPerTenPoints * 5;
        const attempt: TrainerAttempt = { ...a, at: now() };
        const skills: Partial<Record<SkillId, number>> = {};
        for (const c of a.criteria) {
          skills[c.skill] = Math.max(skills[c.skill] ?? 0, Math.round(c.level * 100));
        }
        const next: ProgressState = {
          ...s,
          trainerAttempts: [...s.trainerAttempts, attempt].slice(-300),
          skillEvents: addSkillEvents(s.skillEvents, skills),
          points: s.points + pointsAwarded,
          lastPoints: pointsAwarded,
        };
        set({ ...next, ...withBadges(next, { improved20: improvement !== null && improvement >= 20 }) });
        return { improvement, pointsAwarded };
      },

      recordExercise: (key, type, result) => {
        const s = get();
        const prev = s.exercises[key];
        const first = !prev;
        const points = first ? POINTS.exerciseFirstComplete : 0;
        const next: ProgressState = {
          ...s,
          exercises: {
            ...s.exercises,
            [key]: { type, best: Math.max(prev?.best ?? 0, result.score), attempts: (prev?.attempts ?? 0) + 1, lastAt: now() },
          },
          skillEvents: addSkillEvents(s.skillEvents, result.skills),
          points: s.points + points,
          lastPoints: points,
        };
        set({ ...next, ...withBadges(next) });
      },

      saveDraft: (taskId, text) => set({ drafts: { ...get().drafts, [taskId]: text } }),

      recordAssessment: (level, record) => {
        const s = get();
        const list = [...(s.assessments[level] ?? []), { ...record, at: now() }].slice(-20);
        const next: ProgressState = {
          ...s,
          assessments: { ...s.assessments, [level]: list },
          points: s.points + POINTS.assessmentComplete,
          lastPoints: POINTS.assessmentComplete,
        };
        set({ ...next, ...withBadges(next) });
      },

      setPlacement: (level) => set({ placement: { level, at: now() } }),

      saveLibraryValues: (id, values) => {
        const cur = get().library[id] ?? { values: {} };
        set({ library: { ...get().library, [id]: { ...cur, values } } });
      },

      saveLibraryCustom: (id, text) => {
        const cur = get().library[id] ?? { values: {} };
        set({ library: { ...get().library, [id]: { ...cur, customText: text } } });
      },

      markGhostIntroShown: () => set({ ghostIntroShown: true }),

      consumeNewBadges: () => {
        const list = get().newBadges;
        if (list.length) set({ newBadges: [] });
        return list;
      },

      resetProgress: () => set({ ...initialProgress, settings: get().settings }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { newBadges, lastPoints, ...rest } = s;
        const persisted: Partial<Store> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (typeof v !== 'function') (persisted as Record<string, unknown>)[k] = v;
        }
        return persisted as ProgressState;
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Selektory pomocnicze                                                */
/* ------------------------------------------------------------------ */

export function lessonStatus(s: ProgressState, lessonId: string): 'new' | 'started' | 'done' {
  const p = s.lessons[lessonId];
  if (!p) return 'new';
  if (p.completed) return 'done';
  return p.stepIndex > 0 ? 'started' : 'new';
}

/** Średnia z ostatnich zdarzeń umiejętności (0–100) albo null, gdy brak danych. */
export function skillScore(events: SkillEvent[], skill: SkillId, lastN = 8): { value: number; samples: number } | null {
  const list = events.filter((e) => e.skill === skill).slice(-lastN);
  if (list.length === 0) return null;
  return { value: Math.round(list.reduce((s, e) => s + e.value, 0) / list.length), samples: list.length };
}
