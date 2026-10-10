/** Встроенные привычки с готовыми видами срыва, иконками и текстами. */
export type PresetId = 'alcohol' | 'smoking';
export const PRESET_IDS: readonly PresetId[] = ['alcohol', 'smoking'];

/** Идентификатор привычки: у встроенных совпадает с `PresetId`, у своих — UUID. */
export type HabitId = string;

export type AlcoholKind = 'strong' | 'light';
export type SmokingKind = 'cigarette' | 'hookah' | 'vape' | 'heated' | 'cigar' | 'other';
export type PresetKind = AlcoholKind | SmokingKind;

export const KINDS_BY_PRESET: { alcohol: readonly AlcoholKind[]; smoking: readonly SmokingKind[] } = {
  alcohol: ['strong', 'light'],
  smoking: ['cigarette', 'hookah', 'vape', 'heated', 'cigar', 'other'],
};

/** Цвета встроенных привычек из макетов «Энергия». */
export const PRESET_COLORS: Record<PresetId, string> = {
  alcohol: '#2B3AE0',
  smoking: '#0F766E',
};

/** В чём считать количество при срыве. */
export type HabitUnit = 'times' | 'pieces' | 'servings' | 'minutes' | 'money';
export const HABIT_UNITS: readonly HabitUnit[] = ['times', 'pieces', 'servings', 'minutes', 'money'];

/** Сколько привычек можно вести одновременно: больше не помещается в переключатель. */
export const MAX_HABITS = 6;
export const HABIT_NAME_MAX_LENGTH = 24;
export const HABIT_KINDS_MAX = 8;
export const HABIT_KIND_MAX_LENGTH = 20;

/** Календарная дата без часового пояса: "YYYY-MM-DD". */
export type LocalDate = string;

/** Момент времени в ISO 8601 со смещением: "2026-03-03T00:00:00+03:00". */
export type ZonedDateTime = string;

export interface Habit {
  id: HabitId;
  /** Встроенная привычка или null для своей. */
  preset: PresetId | null;
  /** Название своей привычки; у встроенных пусто, название берётся из словаря. */
  name: string;
  /** Эмодзи своей привычки; у встроенных null — рисуется иконка. */
  emoji: string | null;
  /** Цвет карточек и календаря, HEX. */
  color: string;
  unit: HabitUnit;
  /** Виды срыва своей привычки (названия); у встроенных пусто — виды из `KINDS_BY_PRESET`. */
  kinds: string[];
  /** Порядок на главном экране. */
  order: number;
  enabled: boolean;
  /** null — привычка ещё ни разу не настраивалась. */
  quitAt: ZonedDateTime | null;
  /** Достижения: вехи, достигнутые за всё время. Срыв их не обнуляет. */
  milestonesEarned: number[];
  /** Первый день серии, в которой поздравляли в последний раз; null — ещё ни разу. */
  celebratedSince: LocalDate | null;
  /** До какой вехи в той серии уже поздравляли. */
  celebratedUpTo: number;
}

/** Встроенная привычка, которую ещё не настраивали. */
export const emptyHabit = (id: PresetId): Habit => ({
  id,
  preset: id,
  name: '',
  emoji: null,
  color: PRESET_COLORS[id],
  unit: id === 'smoking' ? 'pieces' : 'times',
  kinds: [],
  order: PRESET_IDS.indexOf(id),
  enabled: false,
  quitAt: null,
  milestonesEarned: [],
  celebratedSince: null,
  celebratedUpTo: 0,
});

export interface Relapse {
  id: string;
  habitId: HabitId;
  /** День срыва в локальном поясе на момент записи. */
  date: LocalDate;
  createdAt: ZonedDateTime;
  /** Вид: ключ из `PresetKind` у встроенных, название у своих, null — без вида. */
  kind: string | null;
  count: number;
  note: string | null;
}

/** Языки интерфейса. Словари лежат в `src/i18n`. */
export type Language = 'ru' | 'en';
export const LANGUAGES: readonly Language[] = ['ru', 'en'];

export interface Settings {
  onboarded: boolean;
  lastScreen: HabitId | null;
  excludeFromBackup: boolean;
  language: Language;
}

export const RELAPSE_NOTE_MAX_LENGTH = 300;
export const RELAPSE_COUNT_MIN = 1;
/** Предел для шагового счётчика (штуки, порции, минуты, разы). */
export const RELAPSE_COUNT_MAX = 99;
/** Предел для суммы денег. */
export const RELAPSE_AMOUNT_MAX = 999_999;
