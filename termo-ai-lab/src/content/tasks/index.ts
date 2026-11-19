import type { PromptTask } from '../types';
import { TASK_KOMUNIKAT, TASK_NAPRAW_AWARIA } from './beginner';
import { TASK_NOTATKA, TASK_RAPORT, TASK_WYKRES } from './intermediate';
import { TASK_ASYSTENT, TASK_OBLICZENIA, TASK_WIELOETAPOWA } from './advanced';
import { DRILLS } from './drills';
import { A_P_NAPISZ, A_P_POPRAW, A_S_NAPISZ, A_S_POPRAW, A_Z_NAPISZ, A_Z_POPRAW } from './assessment';

/** Zadania dostępne w Laboratorium promptów (z lekcji). */
export const LAB_TASKS: PromptTask[] = [
  TASK_KOMUNIKAT,
  TASK_NAPRAW_AWARIA,
  TASK_RAPORT,
  TASK_WYKRES,
  TASK_NOTATKA,
  TASK_WIELOETAPOWA,
  TASK_ASYSTENT,
  TASK_OBLICZENIA,
];

export const DRILL_TASKS = DRILLS;

export const ASSESSMENT_TASKS: PromptTask[] = [A_P_NAPISZ, A_P_POPRAW, A_S_NAPISZ, A_S_POPRAW, A_Z_NAPISZ, A_Z_POPRAW];

export const ALL_TASKS: PromptTask[] = [...LAB_TASKS, ...DRILL_TASKS, ...ASSESSMENT_TASKS];

const TASK_MAP = new Map(ALL_TASKS.map((t) => [t.id, t]));

export function getTask(id: string): PromptTask | undefined {
  return TASK_MAP.get(id);
}
