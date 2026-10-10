import { addDays, calendarDiff, type CalendarPeriod, diffDays, zonedDate } from './localDate';
import { goalProgress } from './milestones';
import type { Habit, LocalDate, Relapse, ZonedDateTime } from './types';

export interface HabitStats {
  quitDate: LocalDate;
  /** Общий счёт: календарные дни от даты отказа до сегодня. Основной счётчик, срыв его не обнуляет. */
  totalDays: number;
  /** Тот же срок в годах, месяцах и днях по календарю. */
  period: CalendarPeriod;
  /** Общий счёт минус завершённые дни, в которые был срыв. */
  cleanDays: number;
  /** Первый день текущей серии: день после последнего срыва или дата отказа. */
  streakStart: LocalDate;
  /** Завершённые чистые дни после дня последнего срыва; без срывов равно общему счёту. */
  daysSinceRelapse: number;
  relapseCount: number;
  /** Число записей по видам; срывы без вида под ключом ''. */
  relapsesByKind: Record<string, number>;
  /** Следующая цель считается по чистым дням с последнего срыва и после срыва начинается заново с 5 дней. */
  goal: number;
  goalRemaining: number;
  goalProgress: number;
}

/** Срывы привычки, которые учитываются: не раньше даты отказа. */
export function countedRelapses(habit: Habit, relapses: readonly Relapse[]): Relapse[] {
  if (!habit.quitAt) return [];
  const quitDate = zonedDate(habit.quitAt);
  return relapses.filter((r) => r.habitId === habit.id && r.date >= quitDate);
}

/** Общий счёт: календарные дни от даты отказа до `today`, не меньше нуля. */
export function totalDaysSince(quitAt: ZonedDateTime, today: LocalDate): number {
  return Math.max(0, diffDays(today, zonedDate(quitAt)));
}

/**
 * Чистые дни с последнего срыва: завершённые дни после дня последнего срыва.
 * Сегодняшний день ещё не завершён и не считается, поэтому срыв сегодня или
 * вчера даёт 0. Без срывов равно общему счёту. Момент записи срыва роли не играет,
 * порядок записей тоже.
 */
export function daysSinceLastRelapse(habit: Habit, relapses: readonly Relapse[], today: LocalDate): number {
  if (!habit.quitAt) return 0;
  return Math.max(0, diffDays(today, streakStartDate(habit, relapses)));
}

/** Первый день текущей серии: день после последнего учитываемого срыва или дата отказа. */
export function streakStartDate(habit: Habit, relapses: readonly Relapse[]): LocalDate {
  if (!habit.quitAt) throw new Error(`Habit ${habit.id} has no quit date`);
  let from = zonedDate(habit.quitAt);
  for (const r of countedRelapses(habit, relapses)) {
    const next = addDays(r.date, 1);
    if (next > from) from = next;
  }
  return from;
}

export function computeHabitStats(habit: Habit, relapses: readonly Relapse[], today: LocalDate): HabitStats {
  if (!habit.quitAt) throw new Error(`Habit ${habit.id} has no quit date`);
  const quitDate = zonedDate(habit.quitAt);
  const counted = countedRelapses(habit, relapses);

  const totalDays = totalDaysSince(habit.quitAt, today);
  // Сегодняшний день ещё не завершён: он не входит ни в общий счёт, ни в «грязные» дни.
  const dirtyDays = new Set(counted.filter((r) => r.date < today).map((r) => r.date)).size;
  const cleanDays = Math.max(0, totalDays - dirtyDays);
  const streakStart = streakStartDate(habit, relapses);
  const daysSinceRelapse = Math.max(0, diffDays(today, streakStart));

  const relapsesByKind: Record<string, number> = {};
  for (const r of counted) relapsesByKind[r.kind ?? ''] = (relapsesByKind[r.kind ?? ''] ?? 0) + 1;

  const goal = goalProgress(daysSinceRelapse);

  return {
    quitDate,
    totalDays,
    period: calendarDiff(quitDate, today),
    cleanDays,
    streakStart,
    daysSinceRelapse,
    relapseCount: counted.length,
    relapsesByKind,
    goal: goal.goal,
    goalRemaining: goal.remaining,
    goalProgress: goal.progress,
  };
}
