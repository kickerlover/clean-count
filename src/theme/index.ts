import type { ViewStyle } from 'react-native';

import { PRESET_COLORS, type PresetId } from '@/domain/types';

export { BASE_WIDTH, createStyles, s, SCALE } from './scale';

/** Токены стиля «Энергия» (ТЗ, раздел 7, и макеты). */
export const colors = {
  background: '#FFF6E9',
  surface: '#FFFFFF',
  subtle: '#F1E6D4',
  textPrimary: '#15131F',
  textSecondary: '#4A4658',
  alcohol: '#2B3AE0',
  smoking: '#0F766E',
  relapseBg: '#FFD9C7',
  relapseText: '#8F2F0A',
  today: '#C2410C',
  onAccent: '#FFFFFF',
  onDark: '#FFF6E9',
  border: '#D8CCB8',
  cardBorder: '#EADFCC',
  cellBorder: '#EFE4D2',
  mutedBg: '#F7EEDF',
  mutedText: '#8A8274',
  scrim: 'rgba(21,19,31,0.6)',
  progressTrack: 'rgba(255,255,255,0.25)',
  danger: '#B42318',
} as const;

/** Цвета встроенных привычек; цвет любой привычки хранится в `habit.color`. */
export const habitColor: Record<PresetId, string> = PRESET_COLORS;

/** Палитра для своих привычек: отличима от встроенных и от акцентов интерфейса. */
export const CUSTOM_HABIT_COLORS: readonly string[] = [
  '#6D28D9', '#BE185D', '#B45309', '#0E7490', '#15803D', '#B91C1C', '#4338CA', '#475569',
];

/** Имена шрифтов после загрузки через expo-font (см. src/theme/fonts.ts). */
export const fonts = {
  display700: 'Unbounded_700Bold',
  display800: 'Unbounded_800ExtraBold',
  text400: 'GolosText_400Regular',
  text500: 'GolosText_500Medium',
  text600: 'GolosText_600SemiBold',
  text700: 'GolosText_700Bold',
} as const;

/**
 * Радиусы, отступы и зоны нажатия заданы для iPhone 14 Pro Max (430 pt). Внутри `createStyles`
 * они масштабируются автоматически; вне стилей оборачивай их в `s()`.
 */
export const radii = {
  counter: 32,
  sheet: 32,
  card: 24,
  tile: 20,
  chip: 12,
  cell: 14,
} as const;

export const spacing = {
  screenX: 20,
  screenTop: 12,
  screenBottom: 16,
  gap: 18,
} as const;

/**
 * Строка «подпись — значение» в настройках и онбординге. При крупном шрифте значение
 * переносится на вторую строку; alignContent центрирует строки по вертикали внутри minHeight.
 */
export const fieldRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  alignContent: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  paddingHorizontal: 14,
  borderRadius: 16,
  backgroundColor: colors.background,
};

/** Минимальная зона нажатия (ТЗ: не меньше 44×44). */
export const HIT = 44;

/** Предел увеличения системного шрифта для крупных чисел, чтобы они не ломали вёрстку. */
export const MAX_FONT_SCALE_NUMBERS = 1.3;
export const MAX_FONT_SCALE_TEXT = 1.8;
