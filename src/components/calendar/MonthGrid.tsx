import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import type { DayCell, MonthModel } from '@/domain/calendar';
import type { Habit, LocalDate } from '@/domain/types';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/i18n';
import { formatDayMonth } from '@/i18n/format';
import { habitName } from '@/i18n/habits';
import { colors, createStyles, fonts, radii, s } from '@/theme';

export const CELL_GAP = 6;
export const CELL_HEIGHT = 42;

interface Props {
  month: MonthModel;
  /** Привычки для цветов и подписей ячеек. */
  habits: readonly Habit[];
  width: number;
  selected: LocalDate | null;
  today: LocalDate;
  onSelect: (date: LocalDate) => void;
}

function MonthGridBase({ month, habits, width, selected, today, onSelect }: Props) {
  useLanguage();
  const cellWidth = Math.floor((width - s(CELL_GAP) * 6) / 7);
  const cells: (DayCell | null)[] = [...Array<null>(month.leadingBlanks).fill(null), ...month.days];
  while (cells.length % 7) cells.push(null);
  const rows: (DayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={[styles.grid, { width }]}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {t.weekdaysShort.map((d) => (
          <Text key={d} style={[styles.weekday, { width: cellWidth }]} maxFontSizeMultiplier={1.3}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) =>
            cell ? (
              <Cell key={cell.date} cell={cell} habits={habits} width={cellWidth} selected={cell.date === selected} today={today} onSelect={onSelect} />
            ) : (
              <View key={`blank-${c}`} style={{ width: cellWidth, height: s(CELL_HEIGHT) }} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

export const MonthGrid = memo(MonthGridBase);

function Cell({
  cell,
  habits,
  width,
  selected,
  today,
  onSelect,
}: {
  cell: DayCell;
  habits: readonly Habit[];
  width: number;
  selected: boolean;
  today: LocalDate;
  onSelect: (d: LocalDate) => void;
}) {
  const inactive = cell.state === 'inactive';
  const filled = cell.state === 'relapse';
  const dayHabits = cell.habitIds.map((id) => habits.find((h) => h.id === id)).filter((h): h is Habit => !!h);
  // Один срыв — цвет привычки; два и больше — диагональ из первых двух цветов.
  const background = filled ? (dayHabits[0]?.color ?? colors.textPrimary) : inactive ? colors.mutedBg : colors.surface;
  const second = dayHabits[1]?.color;
  const border = selected
    ? { borderWidth: 2, borderColor: colors.textPrimary }
    : cell.isToday
      ? { borderWidth: 2, borderColor: colors.today }
      : { borderWidth: 1, borderColor: inactive ? colors.mutedBg : colors.cellBorder };

  const stateText = filled
    ? t.calendar.relapseA11y(dayHabits.map(habitName).join(', '))
    : inactive
      ? t.calendar.stateA11y.inactive
      : t.calendar.stateA11y.clean;
  const stateLabel = [stateText, cell.isToday ? t.calendar.stateA11y.today : ''].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => onSelect(cell.date)}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={t.calendar.dayA11y(formatDayMonth(cell.date, today), stateLabel)}
      accessibilityState={{ selected, disabled: inactive }}
      style={[styles.cell, { width, backgroundColor: background }, border]}
    >
      {second && (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Polygon points="0,0 100,0 0,100" fill={background} />
          <Polygon points="100,0 100,100 0,100" fill={second} />
        </Svg>
      )}
      <Text
        style={[styles.day, filled && styles.dayOnFill, inactive && styles.dayInactive]}
        maxFontSizeMultiplier={1.2}
      >
        {cell.day}
      </Text>
    </Pressable>
  );
}

const styles = createStyles({
  grid: { gap: CELL_GAP },
  row: { flexDirection: 'row', gap: CELL_GAP },
  weekday: { textAlign: 'center', fontFamily: fonts.text600, fontSize: 12, color: colors.textSecondary },
  cell: {
    height: CELL_HEIGHT,
    borderRadius: radii.cell,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  day: { fontFamily: fonts.text600, fontSize: 14, color: colors.textPrimary },
  dayOnFill: { color: colors.onAccent },
  dayInactive: { color: colors.mutedText },
});
