import type { Habit, HabitUnit, PresetKind } from '@/domain/types';

import { t } from './index';

/** Название привычки: у встроенных из словаря, у своих — как ввёл пользователь. */
export function habitName(habit: Habit): string {
  return habit.preset ? t.habit[habit.preset] : habit.name;
}

/** Подпись карточки: «Без алкоголя» у встроенных, название у своих. */
export function habitLabel(habit: Habit): string {
  return habit.preset ? t.habitWithout[habit.preset] : habit.name;
}

/** Подпись вида срыва: у встроенных из словаря, у своих — само название; без вида — пусто. */
export function kindLabel(kind: string | null, habit: Habit): string {
  if (!kind) return '';
  return habit.preset ? (t.kind[kind as PresetKind] ?? kind) : kind;
}

export function unitLabel(unit: HabitUnit): string {
  return t.units[unit];
}
