import {
  HABIT_KIND_MAX_LENGTH,
  HABIT_KINDS_MAX,
  HABIT_NAME_MAX_LENGTH,
  KINDS_BY_PRESET,
  MAX_HABITS,
  type Habit,
  type HabitUnit,
} from './types';

/** Что вводит пользователь при создании или правке своей привычки. */
export interface CustomHabitInput {
  name: string;
  emoji: string;
  color: string;
  unit: HabitUnit;
  /** Виды срыва одной строкой через запятую или уже списком. */
  kinds: string | string[];
}

export type CustomHabitError = 'name' | 'emoji';

/** Первый символ строки как одна графема: эмодзи с модификаторами остаются целыми. */
export function firstGrapheme(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: 'grapheme' }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Segmenter) {
    const first = new Segmenter('ru', { granularity: 'grapheme' }).segment(trimmed)[Symbol.iterator]().next().value;
    if (first) return first.segment;
  }
  return Array.from(trimmed)[0] ?? '';
}

export function parseKinds(kinds: string | string[]): string[] {
  const list = Array.isArray(kinds) ? kinds : kinds.split(/[,;\n]/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of list) {
    const kind = raw.trim().slice(0, HABIT_KIND_MAX_LENGTH);
    const key = kind.toLowerCase();
    if (!kind || seen.has(key)) continue;
    seen.add(key);
    result.push(kind);
  }
  return result.slice(0, HABIT_KINDS_MAX);
}

export function normalizeCustomHabit(input: CustomHabitInput): { name: string; emoji: string; color: string; unit: HabitUnit; kinds: string[] } {
  return {
    name: input.name.trim().slice(0, HABIT_NAME_MAX_LENGTH),
    emoji: firstGrapheme(input.emoji),
    color: input.color,
    unit: input.unit,
    kinds: parseKinds(input.kinds),
  };
}

/** Ошибка ввода или null, если привычку можно сохранить. */
export function validateCustomHabit(input: CustomHabitInput): CustomHabitError | null {
  const n = normalizeCustomHabit(input);
  if (!n.name) return 'name';
  if (!n.emoji) return 'emoji';
  return null;
}

export function createCustomHabit(input: CustomHabitInput, id: string, order: number): Habit {
  const n = normalizeCustomHabit(input);
  return {
    id,
    preset: null,
    name: n.name,
    emoji: n.emoji,
    color: n.color,
    unit: n.unit,
    kinds: n.kinds,
    order,
    enabled: true,
    quitAt: null,
    milestonesEarned: [],
    celebratedSince: null,
    celebratedUpTo: 0,
  };
}

/** Применяет правку своей привычки, не трогая даты, достижения и порядок. */
export function applyCustomHabit(habit: Habit, input: CustomHabitInput): Habit {
  const n = normalizeCustomHabit(input);
  return { ...habit, name: n.name, emoji: n.emoji, color: n.color, unit: n.unit, kinds: n.kinds };
}

/** Виды срыва привычки: ключи встроенных или названия своих. Пусто — срыв записывается без вида. */
export function habitKinds(habit: Habit): readonly string[] {
  return habit.preset ? KINDS_BY_PRESET[habit.preset] : habit.kinds;
}

/** Нужен ли счётчик количества в окне срыва: у алкоголя считаются только эпизоды. */
export function habitCountsAmount(habit: Habit): boolean {
  return habit.preset !== 'alcohol';
}

export function canAddHabit(habits: readonly Habit[]): boolean {
  return habits.length < MAX_HABITS;
}

export function nextHabitOrder(habits: readonly Habit[]): number {
  return habits.reduce((m, h) => Math.max(m, h.order), -1) + 1;
}

export function sortHabits(habits: readonly Habit[]): Habit[] {
  return [...habits].sort((a, b) => a.order - b.order);
}
