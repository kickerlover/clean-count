import { useEffect, useRef } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { HabitStats } from '@/domain/stats';

import { ChevronRightIcon } from './icons';
import { habitKinds } from '@/domain/habits';
import type { Habit, LocalDate } from '@/domain/types';
import { t } from '@/i18n';
import { habitLabel, kindLabel } from '@/i18n/habits';
import { formatDayMonth } from '@/i18n/format';
import { colors, createStyles, fonts, MAX_FONT_SCALE_NUMBERS, MAX_FONT_SCALE_TEXT, radii } from '@/theme';

interface CardProps {
  habit: Habit;
  stats: HabitStats;
}

/** Основной счётчик: календарные дни с даты отказа. Срыв его не обнуляет. */
export function CounterCard({ habit, stats, today }: CardProps & { today: LocalDate }) {
  const since = formatDayMonth(stats.quitDate, today);
  const period = t.main.period(stats.period);
  // Число всегда 112 pt (до пяти цифр помещается в ширину карточки). Если цифр четыре и больше
  // или системный шрифт крупный, подпись рядом не помещается — ставим её под числом.
  const stacked = useWindowDimensions().fontScale > 1.2 || stats.totalDays >= 1000;

  return (
    <View style={[styles.card, styles.counter, { backgroundColor: habit.color }]}>
      <Text style={styles.counterLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {habitLabel(habit)}
      </Text>

      <View
        style={[styles.counterRow, stacked && styles.counterStacked]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t.main.counterA11y(stats.totalDays, since)}
      >
        <Text style={styles.counterNumber} numberOfLines={1} maxFontSizeMultiplier={1}>
          {stats.totalDays}
        </Text>
        <Text style={[styles.counterWord, stacked && styles.counterWordStacked]} maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {t.main.counterDays(stats.totalDays)}
          {stacked ? ' ' : '\n'}
          {t.main.counterSuffix}
        </Text>
      </View>

      {period !== '' && (
        <Text style={styles.counterPeriod} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT} accessibilityRole="text">
          {period}
        </Text>
      )}

      <Text style={styles.counterDetails} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {t.main.counterSince(since)}
      </Text>
    </View>
  );
}

/**
 * Плитка чистых дней: всего и с последнего срыва, а под ними ближайшая цель.
 * Цель считается по чистым дням с последнего срыва, поэтому полоса стоит рядом с этим числом.
 */
export function StatsCard({ habit, stats, onGoalPress }: CardProps & { onGoalPress?: () => void }) {
  const color = habit.color;

  const progress = useSharedValue(stats.goalProgress);
  useEffect(() => {
    progress.set(withTiming(stats.goalProgress, { duration: 500 }));
  }, [progress, stats.goalProgress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View style={[styles.card, styles.stats]}>
      <View style={styles.statsRow}>
        <StatTile value={stats.cleanDays} label={t.main.cleanLabel(stats.cleanDays)} color={color} />
        <View style={styles.statsDivider} />
        <StatTile
          value={stats.daysSinceRelapse}
          label={t.main.sinceRelapseLabel(stats.daysSinceRelapse, stats.relapseCount > 0)}
        />
      </View>

      <Pressable
        onPress={onGoalPress}
        disabled={!onGoalPress}
        accessibilityRole={onGoalPress ? 'button' : 'progressbar'}
        accessibilityLabel={`${t.main.goalA11y(stats.goal, stats.goalRemaining)}${onGoalPress ? `, ${t.main.goalOpen}` : ''}`}
        accessibilityValue={{ min: 0, max: stats.goal, now: stats.daysSinceRelapse }}
        style={({ pressed }) => [styles.goal, pressed && styles.pressed]}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { backgroundColor: color }, barStyle]} />
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.goalText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.main.goal(stats.goal)}
          </Text>
          <View style={styles.goalRight}>
            <Text style={[styles.goalText, styles.goalRemaining]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.main.goalRemaining(stats.goalRemaining)}
            </Text>
            {onGoalPress && <ChevronRightIcon size={16} color={colors.textSecondary} />}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function StatTile({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text
        style={[styles.statValue, color ? { color } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}
      >
        {value}
      </Text>
      <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
    </View>
  );
}

/** Карточка срывов. Прижата к низу страницы, чтобы верхним карточкам оставалось больше места. */
export function RelapsesCard({ habit, stats }: CardProps) {
  const kinds = habitKinds(habit);
  // Для алкоголя показываем оба вида всегда, для остальных — только встречавшиеся; без видов чипов нет.
  const chips = habit.preset === 'alcohol' ? kinds : kinds.filter((k) => (stats.relapsesByKind[k] ?? 0) > 0);

  const scale = useSharedValue(1);
  const previous = useRef(stats.relapseCount);
  useEffect(() => {
    if (stats.relapseCount > previous.current) {
      scale.set(withSequence(withTiming(1.35, { duration: 160 }), withSpring(1, { damping: 8, stiffness: 180 })));
    }
    previous.current = stats.relapseCount;
  }, [scale, stats.relapseCount]);
  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const empty = stats.relapseCount === 0;
  const a11y = empty
    ? t.main.noRelapses
    : `${t.main.relapses}: ${stats.relapseCount}${chips.length ? `. ${chips.map((k) => t.main.relapseChip(kindLabel(k, habit), stats.relapsesByKind[k] ?? 0)).join(', ')}` : ''}`;

  return (
    <View style={styles.relapses} accessible accessibilityLabel={a11y}>
      <View style={styles.relapsesBody}>
        <Text style={styles.relapsesTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {empty ? t.main.noRelapses : t.main.relapses}
        </Text>
        {!empty && chips.length > 0 && (
          <View style={styles.chips}>
            {chips.map((k) => (
              <View key={k} style={styles.chip}>
                <Text style={styles.chipText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {t.main.relapseChip(kindLabel(k, habit), stats.relapsesByKind[k] ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {!empty && (
        <Animated.Text style={[styles.relapsesCount, numberStyle]} maxFontSizeMultiplier={MAX_FONT_SCALE_NUMBERS}>
          {stats.relapseCount}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = createStyles({
  /** Общая форма большой карточки и плитки чистых дней: одинаковые скругление и поля. */
  card: { borderRadius: radii.counter, paddingHorizontal: 24 },
  counter: { paddingTop: 28, paddingBottom: 26, gap: 14 },
  counterLabel: { color: colors.onAccent, opacity: 0.9, fontFamily: fonts.text500, fontSize: 15 },
  counterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  counterStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  counterNumber: {
    color: colors.onAccent,
    fontFamily: fonts.display800,
    fontSize: 112,
    lineHeight: 112,
    letterSpacing: -4.5,
    includeFontPadding: false,
  },
  counterWord: {
    color: colors.onAccent,
    fontFamily: fonts.display700,
    fontSize: 22,
    lineHeight: 24,
    paddingBottom: 12,
  },
  counterWordStacked: { paddingBottom: 0 },
  counterPeriod: { color: colors.onAccent, fontFamily: fonts.text600, fontSize: 17, marginTop: -4 },
  counterDetails: { color: colors.onAccent, opacity: 0.9, fontFamily: fonts.text400, fontSize: 15 },

  stats: { backgroundColor: colors.surface, paddingTop: 24, paddingBottom: 22, gap: 18 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statsDivider: { width: 1, backgroundColor: colors.cardBorder },
  stat: { flex: 1, gap: 6 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.display700, fontSize: 34 },
  statLabel: { color: colors.textSecondary, fontFamily: fonts.text400, fontSize: 13, lineHeight: 17 },
  goal: { gap: 8 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.subtle, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  goalRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pressed: { opacity: 0.6 },
  goalText: { color: colors.textPrimary, fontFamily: fonts.text600, fontSize: 13 },
  goalRemaining: { color: colors.textSecondary },

  relapses: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.relapseBg,
    borderRadius: radii.card,
    padding: 18,
  },
  relapsesBody: { flex: 1, gap: 8 },
  relapsesTitle: { color: colors.textPrimary, fontFamily: fonts.text600, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.surface, borderRadius: radii.chip, paddingVertical: 5, paddingHorizontal: 10 },
  chipText: { color: colors.textPrimary, fontFamily: fonts.text600, fontSize: 13 },
  relapsesCount: { color: colors.relapseText, fontFamily: fonts.display800, fontSize: 40 },
});
