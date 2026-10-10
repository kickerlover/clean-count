import { addDays, localDateAt, toZoned, zonedDate } from './localDate';
import {
  RELAPSE_AMOUNT_MAX,
  RELAPSE_COUNT_MIN,
  RELAPSE_NOTE_MAX_LENGTH,
  type Habit,
  type HabitId,
  type LocalDate,
  type Relapse,
} from './types';

export interface RelapseDateRange {
  min: LocalDate;
  max: LocalDate;
}

/** Срыв можно записать только в пределах [дата отказа, сегодня]. */
export function relapseDateRange(habit: Habit, now: Date, tz: string): RelapseDateRange | null {
  if (!habit.quitAt) return null;
  const min = zonedDate(habit.quitAt);
  const max = localDateAt(now, tz);
  return min <= max ? { min, max } : null;
}

export function isRelapseDateAllowed(habit: Habit, date: LocalDate, now: Date, tz: string): boolean {
  const range = relapseDateRange(habit, now, tz);
  return !!range && date >= range.min && date <= range.max;
}

export function yesterday(now: Date, tz: string): LocalDate {
  return addDays(localDateAt(now, tz), -1);
}

export interface RelapseInput {
  habitId: HabitId;
  date: LocalDate;
  /** Ключ вида у встроенных, название у своих, null — без вида. */
  kind: string | null;
  count?: number;
  note?: string | null;
}

export function buildRelapse(input: RelapseInput, id: string, now: Date, tz: string): Relapse {
  const count = Math.min(RELAPSE_AMOUNT_MAX, Math.max(RELAPSE_COUNT_MIN, Math.round(input.count ?? 1)));
  const note = input.note?.trim().slice(0, RELAPSE_NOTE_MAX_LENGTH) || null;
  return {
    id,
    habitId: input.habitId,
    date: input.date,
    createdAt: toZoned(now, tz),
    kind: input.kind?.trim() || null,
    count,
    note,
  };
}
