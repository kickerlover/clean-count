import { useMemo } from 'react';

import type { Habit } from '@/domain/types';
import { useAppStore } from '@/store/appStore';

/** Включённые и настроенные привычки в порядке показа. */
export function useEnabledHabits(): Habit[] {
  const habits = useAppStore((s) => s.habits);
  return useMemo(() => habits.filter((h) => h.enabled && h.quitAt), [habits]);
}
