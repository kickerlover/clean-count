import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, PillButton } from '@/components/buttons';
import { CounterCard, RelapsesCard, StatsCard } from '@/components/HabitCards';
import { HabitTabs } from '@/components/HabitTabs';
import { CalendarIcon, SettingsIcon, TrophyIcon } from '@/components/icons';
import { MilestoneOverlay } from '@/components/MilestoneOverlay';
import { useRelapseFlow } from '@/components/relapse/useRelapseFlow';
import { pendingMilestone } from '@/domain/milestones';
import { computeHabitStats } from '@/domain/stats';
import type { Habit } from '@/domain/types';
import { useClock } from '@/hooks/clock';
import { useEnabledHabits } from '@/hooks/useEnabledHabits';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/i18n';
import { habitName } from '@/i18n/habits';
import { useAppStore } from '@/store/appStore';
import { colors, createStyles, fonts, MAX_FONT_SCALE_TEXT, s, spacing } from '@/theme';

const BUTTON_HEIGHT = s(60);

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const habits = useEnabledHabits();
  const lastScreen = useAppStore((s) => s.settings.lastScreen);
  const setLastScreen = useAppStore((s) => s.setLastScreen);
  const markCelebrated = useAppStore((s) => s.markCelebrated);
  const relapses = useAppStore((s) => s.relapses);
  const clock = useClock();
  useLanguage();

  const initialIndex = Math.max(0, habits.findIndex((h) => h.id === lastScreen));
  const [index, setIndex] = useState(initialIndex);
  const position = useSharedValue(initialIndex);
  const pager = useRef<PagerView>(null);

  // Набор привычек поменялся в настройках — пейджер пересоздаётся, индекс берём заново.
  const habitsKey = habits.map((h) => h.id).join();
  const [prevKey, setPrevKey] = useState(habitsKey);
  if (prevKey !== habitsKey) {
    setPrevKey(habitsKey);
    setIndex(initialIndex);
    position.set(initialIndex);
  }

  const bottomInset = Math.max(insets.bottom, s(16)) + s(8);
  const flow = useRelapseFlow(bottomInset + BUTTON_HEIGHT + s(12));

  const current: Habit | undefined = habits[Math.min(index, habits.length - 1)];
  // Показатели зависят только от календарной даты, поэтому пересчитываются раз в сутки и при изменении записей.
  const stats = useMemo(() => habits.map((h) => computeHabitStats(h, relapses, clock.today)), [habits, relapses, clock.today]);
  const currentStats = current ? stats[habits.indexOf(current)] : undefined;

  const milestone =
    current && currentStats && !flow.sheetVisible ? pendingMilestone(currentStats.daysSinceRelapse, currentStats.streakStart, current) : null;

  const select = useCallback(
    (i: number) => {
      setIndex(i);
      const habit = habits[i];
      if (habit) setLastScreen(habit.id);
    },
    [habits, setLastScreen],
  );

  if (!current || !currentStats) return <Redirect href="/onboarding" />;

  const openAchievements = (id: Habit['id']) => router.push({ pathname: '/achievements', params: { habit: id } });
  // До трёх привычек переключатель умещается в шапке рядом с кнопками, дальше ему нужна своя строка.
  const tabsInHeader = habits.length > 1 && habits.length <= 3;
  const tabs = habits.length > 1 && (
    <HabitTabs
      tabs={habits.map((h) => ({ key: h.id, label: habitName(h), emoji: h.emoji }))}
      position={position}
      selectedIndex={index}
      onSelect={(i) => pager.current?.setPage(i)}
    />
  );

  const pages = habits.map((habit, i) => (
    <ScrollView
      key={habit.id}
      contentContainerStyle={[styles.page, { paddingBottom: BUTTON_HEIGHT + bottomInset + s(24) }]}
      showsVerticalScrollIndicator={false}
    >
      <CounterCard habit={habit} stats={stats[i]!} today={clock.today} />
      <StatsCard habit={habit} stats={stats[i]!} onGoalPress={() => openAchievements(habit.id)} />
      <RelapsesCard habit={habit} stats={stats[i]!} />
    </ScrollView>
  ));

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + s(12) }]}>
        <View style={styles.topLeft}>
          {tabsInHeader ? (
            tabs
          ) : (
            <Text style={styles.appTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.appName}
            </Text>
          )}
        </View>
        <IconButton label={t.main.achievements} onPress={() => openAchievements(current.id)}>
          <TrophyIcon color={colors.textPrimary} />
        </IconButton>
        <IconButton label={t.main.calendar} onPress={() => router.push({ pathname: '/calendar', params: { filter: current.id } })}>
          <CalendarIcon color={colors.textPrimary} />
        </IconButton>
        <IconButton label={t.main.settings} onPress={() => router.push('/settings')}>
          <SettingsIcon color={colors.textPrimary} />
        </IconButton>
      </View>

      {!tabsInHeader && tabs && <View style={styles.tabsRow}>{tabs}</View>}

      {habits.length > 1 ? (
        <PagerView
          key={habitsKey}
          ref={pager}
          style={styles.pager}
          initialPage={initialIndex}
          onPageScroll={(e) => {
            position.set(e.nativeEvent.position + e.nativeEvent.offset);
          }}
          onPageSelected={(e) => select(e.nativeEvent.position)}
        >
          {pages}
        </PagerView>
      ) : (
        <View style={styles.pager}>{pages[0]}</View>
      )}

      <View style={[styles.bottom, { paddingBottom: bottomInset }]} pointerEvents="box-none">
        <PillButton label={t.main.relapseButton} onPress={() => flow.open(current.id)} />
      </View>

      {flow.elements}

      <MilestoneOverlay
        habit={milestone != null ? current : null}
        milestone={milestone}
        onClose={() => {
          if (milestone != null) markCelebrated(current.id, currentStats.streakStart, milestone).catch(console.error);
        }}
      />
    </View>
  );
}

const styles = createStyles({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.screenX,
    paddingBottom: 6,
  },
  topLeft: { flex: 1, marginRight: 4 },
  tabsRow: { paddingHorizontal: spacing.screenX, paddingTop: 4, paddingBottom: 2 },
  appTitle: { fontFamily: fonts.display700, fontSize: 20, color: colors.textPrimary },
  pager: { flex: 1 },
  // flexGrow: карточка срывов прижимается к низу страницы (marginTop: 'auto'), пока контент короче экрана.
  page: { flexGrow: 1, paddingHorizontal: spacing.screenX, paddingTop: 12, gap: spacing.gap },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screenX,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
});
