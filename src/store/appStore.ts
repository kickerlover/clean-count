import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import * as database from '@/db/database';
import * as repo from '@/db/repo';
import { applyCustomHabit, createCustomHabit, nextHabitOrder, sortHabits, type CustomHabitInput } from '@/domain/habits';
import { achievedMilestones, migrateLegacyMilestones, reachedMilestones } from '@/domain/milestones';
import { buildRelapse, type RelapseInput } from '@/domain/relapse';
import { daysSinceLastRelapse, streakStartDate } from '@/domain/stats';
import {
  emptyHabit,
  PRESET_IDS,
  type Habit,
  type HabitId,
  type Language,
  type LocalDate,
  type Relapse,
  type Settings,
  type ZonedDateTime,
} from '@/domain/types';
import { setLanguage as applyLanguage, systemLanguage } from '@/i18n';

type Status = 'loading' | 'ready' | 'error';

interface AppState {
  status: Status;
  /** Все привычки в порядке показа: встроенные (даже выключенные) и свои. */
  habits: Habit[];
  relapses: Relapse[];
  settings: Settings;

  /** `today` — текущая календарная дата устройства, нужна для перевода старых вех. */
  load(today: LocalDate): Promise<void>;
  /** Завершение настройки: полный список привычек с датами отказа у включённых. */
  completeOnboarding(habits: Habit[]): Promise<void>;
  addRelapse(input: RelapseInput, now: Date, tz: string): Promise<Relapse>;
  removeRelapse(id: string): Promise<void>;
  setQuitAt(id: HabitId, quitAt: ZonedDateTime): Promise<void>;
  setHabitEnabled(id: HabitId, enabled: boolean, quitAt?: ZonedDateTime): Promise<void>;
  /** Новая своя привычка, сразу включённая с датой отказа. */
  addCustomHabit(input: CustomHabitInput, quitAt: ZonedDateTime): Promise<Habit>;
  updateCustomHabit(id: HabitId, input: CustomHabitInput): Promise<void>;
  /** Удаляет свою привычку вместе с её срывами. */
  deleteHabit(id: HabitId): Promise<void>;
  /** Поздравили с вехой `milestone` в серии, начавшейся `streakStart`; веха попадает в достижения. */
  markCelebrated(id: HabitId, streakStart: LocalDate, milestone: number): Promise<void>;
  setLastScreen(id: HabitId): void;
  /** Переключает язык интерфейса и запоминает выбор. */
  setLanguage(language: Language): void;
  setExcludeFromBackup(excluded: boolean): Promise<void>;
  resetAll(): Promise<void>;
}

const presets = (): Habit[] => PRESET_IDS.map(emptyHabit);

export const useAppStore = create<AppState>()((set, get) => {
  const getHabit = (id: HabitId): Habit => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) throw new Error(`Habit ${id} not found`);
    return habit;
  };

  const replaceHabit = (next: Habit) =>
    set((s) => ({ habits: sortHabits(s.habits.map((h) => (h.id === next.id ? next : h))) }));

  const updateHabit = async (id: HabitId, patch: Partial<Habit>) => {
    const next = { ...getHabit(id), ...patch };
    await repo.saveHabit(next);
    replaceHabit(next);
  };

  return {
    status: 'loading',
    habits: presets(),
    relapses: [],
    settings: { onboarded: false, lastScreen: null, excludeFromBackup: false, language: systemLanguage() },

    async load(today) {
      try {
        await database.initDatabase();
        const snapshot = await repo.loadSnapshot();
        // Приводим вехи в порядок. Запись в базу — по возможности: если она не удалась,
        // работаем с исправленными данными в памяти.
        const habits = await Promise.all(
          snapshot.habits.map(async (habit) => {
            if (!habit.quitAt) return habit;
            const days = daysSinceLastRelapse(habit, snapshot.relapses, today);
            let next = habit;
            // Старая схема вех (1, 3, 7, …) заменяется на достигнутые по текущей серии, без поздравления задним числом.
            const migrated = migrateLegacyMilestones(next.milestonesEarned, days);
            if (migrated) next = { ...next, milestonesEarned: migrated };
            // Первый запуск с поздравлениями по сериям: уже заработанные вехи текущей серии считаем показанными.
            if (next.celebratedSince === null) {
              const shown = reachedMilestones(days).filter((m) => next.milestonesEarned.includes(m));
              next = { ...next, celebratedSince: streakStartDate(next, snapshot.relapses), celebratedUpTo: shown[shown.length - 1] ?? 0 };
            }
            // Вехи, достигнутые пока приложение не открывали, записываем в достижения, чтобы они не пропали после срыва.
            const earned = achievedMilestones(next.milestonesEarned, days);
            if (earned.length !== next.milestonesEarned.length) next = { ...next, milestonesEarned: earned };
            if (next !== habit) await repo.saveHabit(next).catch(console.error);
            return next;
          }),
        );
        applyLanguage(snapshot.settings.language);
        set({
          habits: sortHabits(habits),
          relapses: snapshot.relapses,
          settings: { ...snapshot.settings, excludeFromBackup: database.isExcludedFromBackup() },
          status: 'ready',
        });
      } catch (e) {
        console.error(e);
        set({ status: 'error' });
      }
    },

    async completeOnboarding(habits) {
      const sorted = sortHabits(habits);
      await repo.completeOnboarding(sorted);
      const first = sorted.find((h) => h.enabled && h.quitAt)?.id ?? null;
      set((s) => ({
        habits: sorted,
        relapses: [],
        settings: { ...s.settings, onboarded: true, lastScreen: first },
      }));
      if (first) get().setLastScreen(first);
    },

    async addRelapse(input, now, tz) {
      const relapse = buildRelapse(input, randomUUID(), now, tz);
      await repo.insertRelapse(relapse);
      set((s) => ({ relapses: [...s.relapses, relapse] }));
      return relapse;
    },

    async removeRelapse(id) {
      await repo.deleteRelapse(id);
      set((s) => ({ relapses: s.relapses.filter((r) => r.id !== id) }));
    },

    async setQuitAt(id, quitAt) {
      await updateHabit(id, { quitAt });
    },

    async setHabitEnabled(id, enabled, quitAt) {
      const habit = getHabit(id);
      await updateHabit(id, { enabled, quitAt: quitAt ?? habit.quitAt });
    },

    async addCustomHabit(input, quitAt) {
      const habit = { ...createCustomHabit(input, randomUUID(), nextHabitOrder(get().habits)), quitAt };
      await repo.saveHabit(habit);
      set((s) => ({ habits: sortHabits([...s.habits, habit]) }));
      return habit;
    },

    async updateCustomHabit(id, input) {
      const habit = getHabit(id);
      if (habit.preset) return;
      const next = applyCustomHabit(habit, input);
      await repo.saveHabit(next);
      replaceHabit(next);
    },

    async deleteHabit(id) {
      const habit = getHabit(id);
      if (habit.preset) return;
      await repo.deleteHabit(id);
      set((s) => ({
        habits: s.habits.filter((h) => h.id !== id),
        relapses: s.relapses.filter((r) => r.habitId !== id),
        settings: s.settings.lastScreen === id ? { ...s.settings, lastScreen: null } : s.settings,
      }));
    },

    async markCelebrated(id, streakStart, milestone) {
      const habit = getHabit(id);
      await updateHabit(id, {
        celebratedSince: streakStart,
        celebratedUpTo: milestone,
        milestonesEarned: achievedMilestones(habit.milestonesEarned, milestone),
      });
    },

    setLastScreen(id) {
      if (get().settings.lastScreen === id) return;
      set((s) => ({ settings: { ...s.settings, lastScreen: id } }));
      repo.saveSetting('lastScreen', id).catch(console.error);
    },

    setLanguage(language) {
      if (get().settings.language === language) return;
      applyLanguage(language);
      set((s) => ({ settings: { ...s.settings, language } }));
      repo.saveSetting('language', language).catch(console.error);
    },

    async setExcludeFromBackup(excluded) {
      await database.setExcludedFromBackup(excluded);
      set((s) => ({ settings: { ...s.settings, excludeFromBackup: excluded } }));
    },

    async resetAll() {
      await repo.resetAll();
      set((s) => ({
        habits: presets(),
        relapses: [],
        settings: { ...s.settings, onboarded: false, lastScreen: null },
      }));
    },
  };
});
