import type { Lesson, LevelId } from '../types';
import { BEGINNER_LESSONS } from './beginner';
import { INTERMEDIATE_LESSONS } from './intermediate';
import { ADVANCED_LESSONS } from './advanced';

export const LESSONS: Lesson[] = [...BEGINNER_LESSONS, ...INTERMEDIATE_LESSONS, ...ADVANCED_LESSONS];

const LESSON_MAP = new Map(LESSONS.map((l) => [l.id, l]));

export function getLesson(id: string): Lesson | undefined {
  return LESSON_MAP.get(id);
}

export function lessonsForLevel(level: LevelId): Lesson[] {
  return LESSONS.filter((l) => l.level === level).sort((a, b) => a.number - b.number);
}
