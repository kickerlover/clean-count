import { daysInMonth, fromParts, toParts, weekdayMondayFirst, zonedDate } from './localDate';
import { countedRelapses } from './stats';
import type { Habit, HabitId, LocalDate, Relapse } from './types';

export type CalendarFilter = 'all' | HabitId;

export type DayState = 'inactive' | 'clean' | 'relapse';

export interface YearMonth {
  year: number;
  /** 1–12 */
  month: number;
}

export interface DayCell {
  date: LocalDate;
  day: number;
  state: DayState;
  isToday: boolean;
  /** Привычки со срывом в этот день (с учётом фильтра), в порядке привычек. */
  habitIds: HabitId[];
  /** Срывы этого дня с учётом фильтра, в порядке записи. */
  relapses: Relapse[];
}

export interface MonthModel extends YearMonth {
  /** Сколько пустых ячеек перед первым числом (неделя с понедельника). */
  leadingBlanks: number;
  days: DayCell[];
  /** Число записей о срывах за месяц по каждой привычке (без учёта фильтра). */
  totals: Record<HabitId, number>;
}

/** Привычки, которые участвуют в календаре: включены и настроены. */
export function calendarHabits(habits: readonly Habit[]): Habit[] {
  return habits.filter((h) => h.enabled && h.quitAt);
}

function habitsForFilter(habits: readonly Habit[], filter: CalendarFilter): Habit[] {
  const active = calendarHabits(habits);
  return filter === 'all' ? active : active.filter((h) => h.id === filter);
}

/** Самая ранняя дата отказа среди привычек фильтра — раньше неё дни неактивны. */
export function earliestQuitDate(habits: readonly Habit[], filter: CalendarFilter = 'all'): LocalDate | null {
  const dates = habitsForFilter(habits, filter).map((h) => zonedDate(h.quitAt!));
  return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

export function yearMonthOf(date: LocalDate): YearMonth {
  const { year, month } = toParts(date);
  return { year, month };
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Месяцы от месяца самой ранней даты отказа до текущего включительно. */
export function monthRange(habits: readonly Habit[], today: LocalDate): YearMonth[] {
  const last = yearMonthOf(today);
  const earliest = earliestQuitDate(habits);
  let cursor = earliest && earliest <= today ? yearMonthOf(earliest) : last;
  const months: YearMonth[] = [];
  while (cursor.year * 12 + cursor.month <= last.year * 12 + last.month) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

export function buildMonth(
  ym: YearMonth,
  habits: readonly Habit[],
  relapses: readonly Relapse[],
  filter: CalendarFilter,
  today: LocalDate,
): MonthModel {
  const prefix = fromParts({ year: ym.year, month: ym.month, day: 1 }).slice(0, 8);
  const active = calendarHabits(habits);
  const visible = habitsForFilter(habits, filter);
  const firstActive = earliestQuitDate(habits, filter);

  const byDate = new Map<LocalDate, Relapse[]>();
  const totals: Record<HabitId, number> = {};
  for (const habit of active) {
    totals[habit.id] = 0;
    const shown = visible.includes(habit);
    for (const r of countedRelapses(habit, relapses)) {
      if (!r.date.startsWith(prefix)) continue;
      totals[habit.id]! += 1;
      if (!shown) continue;
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    }
  }

  const count = daysInMonth(ym.year, ym.month);
  const days: DayCell[] = [];
  for (let day = 1; day <= count; day++) {
    const date = fromParts({ year: ym.year, month: ym.month, day });
    const dayRelapses = (byDate.get(date) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const inRange = !!firstActive && date >= firstActive && date <= today;
    const habitIds = inRange ? visible.filter((h) => dayRelapses.some((r) => r.habitId === h.id)).map((h) => h.id) : [];
    const state: DayState = !inRange ? 'inactive' : habitIds.length ? 'relapse' : 'clean';
    days.push({ date, day, state, isToday: date === today, habitIds, relapses: inRange ? dayRelapses : [] });
  }

  return {
    ...ym,
    leadingBlanks: weekdayMondayFirst(fromParts({ year: ym.year, month: ym.month, day: 1 })),
    days,
    totals,
  };
}
