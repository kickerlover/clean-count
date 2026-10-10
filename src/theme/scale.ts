import { Dimensions, StyleSheet } from 'react-native';

/**
 * Единый масштаб интерфейса. Макеты и все размеры в коде заданы для iPhone 14 Pro Max
 * (430 pt по ширине). На экранах другой ширины размеры, отступы, радиусы и шрифты
 * умножаются на отношение ширин, чтобы композиция экранов совпадала с эталоном.
 * Приложение только портретное, поэтому берём меньшую сторону окна.
 */
export const BASE_WIDTH = 430;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function computeScale(): number {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  // Ниже 0.8 текст становится неудобочитаемым, выше 1.1 — нет смысла (самые большие iPhone ≈ 440 pt).
  return clamp(shortSide / BASE_WIDTH, 0.8, 1.1);
}

export const SCALE = computeScale();

/** Размер в pt для текущего экрана: `s(20)` — это 20 pt на 14 Pro Max и ~18 pt на iPhone 17e. */
export const s = (n: number): number => Math.round(n * SCALE * 2) / 2;

/** Свойства стилей, которые задают размеры и масштабируются. Толщина линий и flex остаются как есть. */
const SCALED_KEYS = new Set([
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'top',
  'bottom',
  'left',
  'right',
  'shadowRadius',
]);

/**
 * Замена `StyleSheet.create`: числовые размеры в стилях масштабируются под экран.
 * Значения в стилях пишутся как для 14 Pro Max; токены темы (`radii`, `spacing`, `HIT`)
 * тоже заданы для него и масштабируются здесь, поэтому вне стилей их нужно оборачивать в `s()`.
 */
export function createStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>>(styles: T & StyleSheet.NamedStyles<unknown>): T {
  const scaled: Record<string, Record<string, unknown>> = {};
  for (const [name, style] of Object.entries(styles as Record<string, Record<string, unknown>>)) {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(style)) {
      next[key] = typeof value === 'number' && SCALED_KEYS.has(key) ? s(value) : value;
    }
    scaled[name] = next;
  }
  return StyleSheet.create(scaled as unknown as T & StyleSheet.NamedStyles<unknown>);
}
