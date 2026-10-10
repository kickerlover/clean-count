import { sortHabits } from '@/domain/habits';
import {
  emptyHabit,
  HABIT_UNITS,
  PRESET_IDS,
  type Habit,
  type HabitId,
  type HabitUnit,
  type PresetId,
  type Relapse,
  type Settings,
} from '@/domain/types';
import { isLanguage, systemLanguage } from '@/i18n';

import { getDatabase } from './database';

interface HabitRow {
  id: string;
  preset: string | null;
  name: string;
  emoji: string | null;
  color: string;
  unit: string;
  kinds: string;
  sort_order: number;
  enabled: number;
  quit_at: string | null;
  milestones_shown: string;
  celebrated_since: string | null;
  celebrated_up_to: number;
}

interface RelapseRow {
  id: string;
  habit_id: string;
  date: string;
  created_at: string;
  kind: string | null;
  count: number;
  note: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

const DEFAULT_SETTINGS: Settings = { onboarded: false, lastScreen: null, excludeFromBackup: false, language: 'ru' };

function parseJsonList<T>(value: string, isItem: (x: unknown) => x is T): T[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}
const isNumber = (x: unknown): x is number => typeof x === 'number';
const isString = (x: unknown): x is string => typeof x === 'string';
const isPreset = (x: string | null): x is PresetId => (PRESET_IDS as readonly string[]).includes(x ?? '');
const toUnit = (x: string): HabitUnit => ((HABIT_UNITS as readonly string[]).includes(x) ? (x as HabitUnit) : 'times');

const toHabit = (row: HabitRow): Habit => ({
  id: row.id,
  preset: isPreset(row.preset) ? row.preset : null,
  name: row.name,
  emoji: row.emoji,
  color: row.color,
  unit: toUnit(row.unit),
  kinds: parseJsonList(row.kinds, isString),
  order: row.sort_order,
  enabled: row.enabled === 1,
  quitAt: row.quit_at,
  milestonesEarned: parseJsonList(row.milestones_shown, isNumber),
  celebratedSince: row.celebrated_since,
  celebratedUpTo: row.celebrated_up_to ?? 0,
});

const toRelapse = (row: RelapseRow): Relapse => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
  createdAt: row.created_at,
  kind: row.kind,
  count: row.count,
  note: row.note,
});

export interface Snapshot {
  /** Привычки в порядке показа: встроенные всегда есть (даже выключенные), свои — только созданные. */
  habits: Habit[];
  relapses: Relapse[];
  settings: Settings;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const db = getDatabase();
  const [habitRows, relapseRows, settingRows] = await Promise.all([
    db.getAllAsync<HabitRow>('SELECT * FROM habits'),
    db.getAllAsync<RelapseRow>('SELECT * FROM relapses ORDER BY date, created_at'),
    db.getAllAsync<SettingRow>('SELECT * FROM settings'),
  ]);

  const habits = habitRows.map(toHabit);
  for (const id of PRESET_IDS) {
    if (!habits.some((h) => h.id === id)) habits.push(emptyHabit(id));
  }

  const raw = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
  const settings: Settings = {
    onboarded: raw.onboarded === '1',
    lastScreen: typeof raw.lastScreen === 'string' && habits.some((h) => h.id === raw.lastScreen) ? raw.lastScreen : null,
    excludeFromBackup: DEFAULT_SETTINGS.excludeFromBackup,
    // Язык: сохранённый выбор, иначе язык устройства.
    language: isLanguage(raw.language) ? raw.language : systemLanguage(),
  };

  return { habits: sortHabits(habits), relapses: relapseRows.map(toRelapse), settings };
}

/**
 * Именно UPSERT, а не `INSERT OR REPLACE`: REPLACE удаляет старую строку и вставляет новую,
 * а удаление строки привычки каскадом стирает все её срывы (`ON DELETE CASCADE` в `relapses`).
 */
const UPSERT_HABIT = `INSERT INTO habits
  (id, preset, name, emoji, color, unit, kinds, sort_order, enabled, quit_at, milestones_shown, celebrated_since, celebrated_up_to)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    preset = excluded.preset,
    name = excluded.name,
    emoji = excluded.emoji,
    color = excluded.color,
    unit = excluded.unit,
    kinds = excluded.kinds,
    sort_order = excluded.sort_order,
    enabled = excluded.enabled,
    quit_at = excluded.quit_at,
    milestones_shown = excluded.milestones_shown,
    celebrated_since = excluded.celebrated_since,
    celebrated_up_to = excluded.celebrated_up_to`;
const habitParams = (h: Habit) =>
  [
    h.id,
    h.preset,
    h.name,
    h.emoji,
    h.color,
    h.unit,
    JSON.stringify(h.kinds),
    h.order,
    h.enabled ? 1 : 0,
    h.quitAt,
    JSON.stringify(h.milestonesEarned),
    h.celebratedSince,
    h.celebratedUpTo,
  ] as const;

export async function saveHabit(habit: Habit): Promise<void> {
  await getDatabase().runAsync(UPSERT_HABIT, ...habitParams(habit));
}

/** Удаляет свою привычку вместе с её срывами (каскад по внешнему ключу). */
export async function deleteHabit(id: HabitId): Promise<void> {
  await getDatabase().runAsync('DELETE FROM habits WHERE id = ? AND preset IS NULL', id);
}

export async function completeOnboarding(habits: Habit[]): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const h of habits) {
      await tx.runAsync(UPSERT_HABIT, ...habitParams(h));
    }
    await tx.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarded', '1')");
  });
}

export async function insertRelapse(r: Relapse): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO relapses (id, habit_id, date, created_at, kind, count, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    r.id,
    r.habitId,
    r.date,
    r.createdAt,
    r.kind,
    r.count,
    r.note,
  );
}

export async function deleteRelapse(id: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM relapses WHERE id = ?', id);
}

export async function saveSetting(key: 'lastScreen' | 'language', value: string): Promise<void> {
  await getDatabase().runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

/** Сброс: срывы и свои привычки удаляются, встроенные выключаются, язык остаётся. */
export async function resetAll(): Promise<void> {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      DELETE FROM relapses;
      DELETE FROM habits WHERE preset IS NULL;
      UPDATE habits SET enabled = 0, quit_at = NULL, milestones_shown = '[]', celebrated_since = NULL, celebrated_up_to = 0;
      DELETE FROM settings WHERE key <> 'language';
    `);
  });
}
