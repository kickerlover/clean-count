import * as Haptics from 'expo-haptics';
import { Alert, Pressable, Text, View } from 'react-native';

import type { DayCell } from '@/domain/calendar';
import type { Habit, LocalDate, Relapse } from '@/domain/types';
import { t } from '@/i18n';
import { formatDayWithWeekday } from '@/i18n/format';
import { habitName, kindLabel } from '@/i18n/habits';
import { colors, createStyles, fonts, HIT, MAX_FONT_SCALE_TEXT, radii } from '@/theme';

import { PlusIcon } from '../icons';

interface Props {
  cell: DayCell | null;
  habits: readonly Habit[];
  today: LocalDate;
  canAdd: boolean;
  onAdd: () => void;
  onDelete: (relapse: Relapse) => void;
}

export function DayDetails({ cell, habits, today, canAdd, onAdd, onDelete }: Props) {
  if (!cell) {
    return (
      <View style={styles.card}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.calendar.selectDay}
        </Text>
        <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.calendar.selectDayHint}
        </Text>
      </View>
    );
  }

  const confirmDelete = (relapse: Relapse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(t.calendar.deleteTitle, t.calendar.deleteText, [
      { text: t.calendar.cancel, style: 'cancel' },
      { text: t.calendar.delete, style: 'destructive', onPress: () => onDelete(relapse) },
    ]);
  };

  const emptyText =
    cell.date > today ? t.calendar.futureDay : cell.state === 'inactive' ? t.calendar.beforeQuit : t.calendar.cleanDay;

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {formatDayWithWeekday(cell.date, today)}
      </Text>

      {cell.relapses.length === 0 ? (
        <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {emptyText}
        </Text>
      ) : (
        cell.relapses.map((r) => {
          const habit = habits.find((h) => h.id === r.habitId);
          if (!habit) return null;
          const label = t.calendar.relapseLabel(habitName(habit), kindLabel(r.kind, habit), r.count);
          return (
            <Pressable
              key={r.id}
              onLongPress={() => confirmDelete(r)}
              delayLongPress={400}
              accessibilityRole="button"
              accessibilityLabel={r.note ? `${label}. ${r.note}` : label}
              accessibilityHint={t.calendar.deleteHint}
              accessibilityActions={[{ name: 'longpress', label: t.calendar.delete }]}
              onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && confirmDelete(r)}
              style={({ pressed }) => [styles.relapse, pressed && styles.pressed]}
            >
              <View style={[styles.chip, { backgroundColor: habit.color }]}>
                <Text style={styles.chipText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {label}
                </Text>
              </View>
              {r.note && (
                <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {r.note}
                </Text>
              )}
            </Pressable>
          );
        })
      )}

      {canAdd && (
        <Pressable onPress={onAdd} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <PlusIcon color={colors.textPrimary} />
          <Text style={styles.addText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.calendar.addRelapse}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = createStyles({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: 16, paddingHorizontal: 18, gap: 10 },
  title: { fontFamily: fonts.text700, fontSize: 15, color: colors.textPrimary },
  muted: { fontFamily: fonts.text400, fontSize: 14, color: colors.textSecondary },
  relapse: { gap: 4, borderRadius: 12, paddingVertical: 2 },
  pressed: { opacity: 0.6 },
  chip: { alignSelf: 'flex-start', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontFamily: fonts.text600, fontSize: 13, color: colors.onAccent },
  note: { fontFamily: fonts.text400, fontSize: 14, color: colors.textSecondary },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: HIT,
    paddingHorizontal: 14,
    marginLeft: -4,
    borderRadius: HIT / 2,
    backgroundColor: colors.subtle,
  },
  addText: { fontFamily: fonts.text600, fontSize: 14, color: colors.textPrimary },
});
