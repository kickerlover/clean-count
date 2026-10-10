import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isBackupExclusionAvailable } from '../../modules/backup-exclusion';

import { IconButton } from '@/components/buttons';
import { pick } from '@/components/DatePicker';
import { HabitFormSheet } from '@/components/habit/HabitFormSheet';
import { HabitIcon } from '@/components/HabitIcon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/icons';
import { canAddHabit, type CustomHabitInput } from '@/domain/habits';
import { localDateTime, toZoned, zonedDate, zonedMinutes } from '@/domain/localDate';
import { LANGUAGES, MAX_HABITS, type Habit, type ZonedDateTime } from '@/domain/types';
import { useLanguage } from '@/hooks/useLanguage';
import { readNow } from '@/hooks/clock';
import { t } from '@/i18n';
import { formatFullDate, formatTime } from '@/i18n/format';
import { habitName } from '@/i18n/habits';
import { useAppStore } from '@/store/appStore';
import { colors, createStyles, fieldRow, fonts, HIT, MAX_FONT_SCALE_TEXT, radii, s, spacing } from '@/theme';

function confirm(title: string, message: string, action: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: t.settings.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: action, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const showError = (e: unknown) => {
  console.error(e);
  Alert.alert(t.errors.title, t.sheet.saveError);
};

interface FormState {
  visible: boolean;
  /** Правка существующей своей привычки или null — создание. */
  editing: Habit | null;
  /** Дата отказа для новой привычки: спрашиваем до открытия формы, чтобы не класть окно на окно. */
  quitAt: ZonedDateTime | null;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const habits = useAppStore((s) => s.habits);
  const excludeFromBackup = useAppStore((s) => s.settings.excludeFromBackup);
  const setHabitEnabled = useAppStore((s) => s.setHabitEnabled);
  const setQuitAt = useAppStore((s) => s.setQuitAt);
  const addCustomHabit = useAppStore((s) => s.addCustomHabit);
  const updateCustomHabit = useAppStore((s) => s.updateCustomHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const setExcludeFromBackup = useAppStore((s) => s.setExcludeFromBackup);
  const resetAll = useAppStore((s) => s.resetAll);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const language = useLanguage();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>({ visible: false, editing: null, quitAt: null });
  const languagePosition = useSharedValue(LANGUAGES.indexOf(language));

  const selectLanguage = (i: number) => {
    const next = LANGUAGES[i];
    if (!next) return;
    languagePosition.set(withTiming(i, { duration: 220 }));
    setLanguage(next);
  };

  const enabledCount = habits.filter((h) => h.enabled && h.quitAt).length;

  const toggleHabit = async (habit: Habit, enabled: boolean) => {
    if (!enabled && enabledCount <= 1) {
      Alert.alert(t.settings.lastHabitTitle, t.settings.lastHabitText);
      return;
    }
    try {
      if (enabled && !habit.quitAt) {
        // Привычка включается впервые — сразу спрашиваем дату отказа.
        const { today, tz } = readNow();
        const date = await pick({ mode: 'date', value: today, max: today });
        if (!date) return;
        await setHabitEnabled(habit.id, true, toZoned(localDateTime(date, 0, tz), tz));
        return;
      }
      await setHabitEnabled(habit.id, enabled);
    } catch (e) {
      showError(e);
    }
  };

  const changeQuit = async (habit: Habit, part: 'date' | 'time') => {
    if (!habit.quitAt) return;
    const { today, tz } = readNow();
    const currentDate = zonedDate(habit.quitAt);
    const currentMinutes = zonedMinutes(habit.quitAt);
    let date = currentDate;
    let minutes = currentMinutes;
    if (part === 'date') {
      const picked = await pick({ mode: 'date', value: currentDate, max: today });
      if (!picked || picked === currentDate) return;
      date = picked;
    } else {
      const picked = await pick({ mode: 'time', value: currentMinutes });
      if (picked == null || picked === currentMinutes) return;
      minutes = picked;
    }
    const ok = await confirm(t.settings.changeDateTitle, t.settings.changeDateText, t.settings.change);
    if (!ok) return;
    try {
      await setQuitAt(habit.id, toZoned(localDateTime(date, minutes, tz), tz));
    } catch (e) {
      showError(e);
    }
  };

  const startAddHabit = async () => {
    const { today, tz } = readNow();
    const date = await pick({ mode: 'date', value: today, max: today });
    if (!date) return;
    setForm({ visible: true, editing: null, quitAt: toZoned(localDateTime(date, 0, tz), tz) });
  };

  const closeForm = () => setForm((f) => ({ ...f, visible: false }));

  const submitForm = async (input: CustomHabitInput) => {
    try {
      if (form.editing) await updateCustomHabit(form.editing.id, input);
      else if (form.quitAt) await addCustomHabit(input, form.quitAt);
    } catch (e) {
      showError(e);
    }
  };

  const removeHabit = async () => {
    const habit = form.editing;
    if (!habit) return;
    if (habit.enabled && habit.quitAt && enabledCount <= 1) {
      Alert.alert(t.settings.lastHabitTitle, t.settings.lastHabitText);
      return;
    }
    if (!(await confirm(t.habits.deleteTitle, t.habits.deleteText, t.habits.delete, true))) return;
    try {
      await deleteHabit(habit.id);
      closeForm();
    } catch (e) {
      showError(e);
    }
  };

  const toggleBackup = async (value: boolean) => {
    setBusy(true);
    try {
      await setExcludeFromBackup(value);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!(await confirm(t.settings.resetTitle, t.settings.resetText, t.settings.continue, true))) return;
    if (!(await confirm(t.settings.resetConfirmTitle, t.settings.resetConfirmText, t.settings.resetConfirm, true))) return;
    try {
      await resetAll();
      router.dismissAll();
      router.replace('/onboarding');
    } catch (e) {
      showError(e);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + s(12), paddingBottom: insets.bottom + s(28) }]}
    >
      <View style={styles.header}>
        <IconButton label={t.settings.back} onPress={() => router.back()}>
          <ChevronLeftIcon color={colors.textPrimary} />
        </IconButton>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.settings.title}
        </Text>
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.habits}
      </Text>
      {habits.map((habit) => {
        const on = habit.enabled && !!habit.quitAt;
        const name = habitName(habit);
        return (
          <View key={habit.id} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: habit.color }]}>
                <HabitIcon habit={habit} size={20} color={colors.onAccent} />
              </View>
              <Text style={styles.rowTitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                {name}
              </Text>
              <Switch
                value={on}
                onValueChange={(v) => toggleHabit(habit, v)}
                trackColor={{ true: habit.color, false: colors.border }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
                accessibilityLabel={`${t.settings.enabled}: ${name}`}
              />
            </View>
            {habit.quitAt && (
              <>
                <SettingRow
                  label={t.settings.quitDate}
                  value={formatFullDate(zonedDate(habit.quitAt))}
                  onPress={() => changeQuit(habit, 'date')}
                />
                <SettingRow
                  label={t.onboarding.quitTime}
                  value={formatTime(zonedMinutes(habit.quitAt))}
                  onPress={() => changeQuit(habit, 'time')}
                />
              </>
            )}
            {!habit.preset && (
              <SettingRow
                label={t.habits.custom}
                value={t.habits.edit}
                onPress={() => setForm({ visible: true, editing: habit, quitAt: null })}
              />
            )}
          </View>
        );
      })}
      {canAddHabit(habits) ? (
        <Pressable onPress={startAddHabit} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <PlusIcon color={colors.textPrimary} />
          <Text style={styles.addText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.habits.add}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.habits.limit(MAX_HABITS)}
        </Text>
      )}

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.language}
      </Text>
      <View style={styles.card}>
        <SegmentedControl
          segments={LANGUAGES.map((l) => ({ key: l, label: t.settings.languages[l] }))}
          position={languagePosition}
          selectedIndex={LANGUAGES.indexOf(language)}
          onSelect={selectLanguage}
          accessibilityLabel={t.settings.language}
        />
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.privacy}
      </Text>
      <View style={styles.card}>
        <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.settings.privacyText}
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.settings.excludeBackup}
          </Text>
          <Switch
            value={excludeFromBackup}
            disabled={!isBackupExclusionAvailable || busy}
            onValueChange={toggleBackup}
            trackColor={{ true: colors.textPrimary, false: colors.border }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
            accessibilityLabel={t.settings.excludeBackup}
          />
        </View>
        <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {isBackupExclusionAvailable ? t.settings.excludeBackupText : t.settings.excludeBackupUnavailable}
        </Text>
      </View>

      <Pressable onPress={reset} accessibilityRole="button" style={({ pressed }) => [styles.danger, pressed && styles.pressed]}>
        <Text style={styles.dangerText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.settings.reset}
        </Text>
      </Pressable>

      <Text style={styles.version} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {t.settings.version(Constants.expoConfig?.version ?? '1.0.0')}
      </Text>

      <HabitFormSheet
        visible={form.visible}
        initial={form.editing}
        onClose={closeForm}
        onSubmit={submitForm}
        onDelete={form.editing ? removeHabit : undefined}
      />
    </ScrollView>
  );
}

function SettingRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
    >
      <Text style={styles.settingLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
      <View style={styles.settingValueWrap}>
        <Text style={styles.settingValue} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {value}
        </Text>
        <ChevronRightIcon size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = createStyles({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screenX, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  sectionTitle: { fontFamily: fonts.text600, fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontFamily: fonts.text600, fontSize: 16, color: colors.textPrimary },
  settingRow: { ...fieldRow, minHeight: 48 },
  settingLabel: { fontFamily: fonts.text500, fontSize: 15, color: colors.textSecondary },
  settingValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontFamily: fonts.text700, fontSize: 15, color: colors.textPrimary },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: HIT + 8,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addText: { flex: 1, fontFamily: fonts.text600, fontSize: 15, color: colors.textPrimary },
  muted: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  hint: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  danger: {
    marginTop: 10,
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { fontFamily: fonts.text700, fontSize: 16, color: colors.danger },
  pressed: { opacity: 0.6 },
  version: { textAlign: 'center', fontFamily: fonts.text400, fontSize: 12, color: colors.mutedText, marginTop: 4 },
});
