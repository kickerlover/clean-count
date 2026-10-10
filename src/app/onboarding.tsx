import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '@/components/buttons';
import { pick } from '@/components/DatePicker';
import { HabitFormSheet } from '@/components/habit/HabitFormSheet';
import { HabitIcon } from '@/components/HabitIcon';
import { CheckIcon, GlassIcon, PlusIcon, SmokingKindIcon } from '@/components/icons';
import { applyCustomHabit, createCustomHabit, type CustomHabitInput } from '@/domain/habits';
import { localDateTime, toZoned } from '@/domain/localDate';
import { emptyHabit, MAX_HABITS, PRESET_IDS, type Habit, type HabitId, type LocalDate, type PresetId } from '@/domain/types';
import { readNow, useClock } from '@/hooks/clock';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/i18n';
import { formatFullDate, formatTime } from '@/i18n/format';
import { habitLabel, habitName } from '@/i18n/habits';
import { useAppStore } from '@/store/appStore';
import { colors, createStyles, fieldRow, fonts, HIT, MAX_FONT_SCALE_TEXT, radii, s, spacing } from '@/theme';

const STEPS = 3;

interface QuitDraft {
  date: LocalDate;
  /** Минуты от полуночи; null — время не указано (00:00). */
  minutes: number | null;
}

const PRESETS: Habit[] = PRESET_IDS.map(emptyHabit);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { today } = useClock();
  useLanguage();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<PresetId[]>([]);
  /** Свои привычки, добавленные на шаге выбора; порядок — после встроенных. */
  const [customs, setCustoms] = useState<Habit[]>([]);
  const [drafts, setDrafts] = useState<Record<HabitId, QuitDraft>>({});
  const [form, setForm] = useState<{ visible: boolean; editing: Habit | null }>({ visible: false, editing: null });
  const [saving, setSaving] = useState(false);

  const draftOf = (id: HabitId): QuitDraft => drafts[id] ?? { date: today, minutes: null };
  const chosen: Habit[] = [...PRESETS.filter((h) => selected.includes(h.id as PresetId)), ...customs];
  const canAddCustom = PRESETS.length + customs.length < MAX_HABITS;

  const toggle = (id: PresetId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : PRESET_IDS.filter((h) => h === id || s.includes(h))));

  const updateDraft = (id: HabitId, patch: Partial<QuitDraft>) => setDrafts((d) => ({ ...d, [id]: { ...draftOf(id), ...patch } }));

  const pickDate = async (id: HabitId) => {
    const value = await pick({ mode: 'date', value: draftOf(id).date, max: readNow().today });
    if (value) updateDraft(id, { date: value });
  };

  const pickTime = async (id: HabitId) => {
    const value = await pick({ mode: 'time', value: draftOf(id).minutes ?? 0 });
    if (value != null) updateDraft(id, { minutes: value });
  };

  const submitCustom = (input: CustomHabitInput) => {
    if (form.editing) {
      const edited = form.editing;
      setCustoms((list) => list.map((h) => (h.id === edited.id ? applyCustomHabit(h, input) : h)));
    } else {
      setCustoms((list) => [...list, createCustomHabit(input, randomUUID(), PRESETS.length + list.length)]);
    }
  };

  const removeCustom = () => {
    const editing = form.editing;
    if (!editing) return;
    setCustoms((list) => list.filter((h) => h.id !== editing.id).map((h, i) => ({ ...h, order: PRESETS.length + i })));
    setForm({ visible: false, editing: null });
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { tz, today: now } = readNow();
      const quitAt = (id: HabitId) => {
        const draft = draftOf(id);
        const date = draft.date > now ? now : draft.date;
        return toZoned(localDateTime(date, draft.minutes ?? 0, tz), tz);
      };
      const habits: Habit[] = [
        ...PRESETS.map((h) => {
          const on = selected.includes(h.id as PresetId);
          return { ...h, enabled: on, quitAt: on ? quitAt(h.id) : null };
        }),
        ...customs.map((h) => ({ ...h, quitAt: quitAt(h.id) })),
      ];
      await completeOnboarding(habits);
      router.replace('/main');
    } catch (e) {
      console.error(e);
      setSaving(false);
      Alert.alert(t.errors.title, t.sheet.saveError);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + s(16), paddingBottom: Math.max(insets.bottom, s(16)) + s(8) }]}>
      <View style={styles.progress} accessible accessibilityLabel={t.onboarding.step(step + 1, STEPS)}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <Animated.View key="welcome" entering={FadeIn} exiting={FadeOut} style={styles.stepBody}>
            <View style={styles.hero}>
              <View style={[styles.heroTile, { backgroundColor: colors.alcohol }]}>
                <GlassIcon size={40} color={colors.onAccent} />
              </View>
              <View style={[styles.heroTile, { backgroundColor: colors.smoking }]}>
                <SmokingKindIcon kind="cigarette" size={40} color={colors.onAccent} />
              </View>
              <View style={[styles.heroTile, styles.heroTilePlus]}>
                <PlusIcon size={34} color={colors.textPrimary} />
              </View>
            </View>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.welcomeTitle}
            </Text>
            <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.welcomeText}
            </Text>
            <View style={styles.points}>
              {t.onboarding.welcomePoints.map((p) => (
                <View key={p} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <CheckIcon size={14} color={colors.onDark} />
                  </View>
                  <Text style={styles.pointText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View key="habits" entering={FadeIn} exiting={FadeOut} style={styles.stepBody}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.habitsTitle}
            </Text>
            <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.habitsText}
            </Text>
            {PRESETS.map((habit) => {
              const id = habit.id as PresetId;
              const on = selected.includes(id);
              return (
                <HabitCard
                  key={id}
                  habit={habit}
                  on={on}
                  subtitle={t.onboarding.habitCardText[id]}
                  onPress={() => toggle(id)}
                  accessibilityRole="switch"
                />
              );
            })}
            {customs.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                on
                subtitle={t.habits.cardText(habit.name)}
                onPress={() => setForm({ visible: true, editing: habit })}
                accessibilityRole="button"
                accessibilityHint={t.habits.edit}
              />
            ))}
            {canAddCustom ? (
              <Pressable
                onPress={() => setForm({ visible: true, editing: null })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.addCard, pressed && styles.pressed]}
              >
                <View style={[styles.habitIcon, { backgroundColor: colors.subtle }]}>
                  <PlusIcon size={22} color={colors.textPrimary} />
                </View>
                <Text style={styles.addText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                  {t.habits.add}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.limit} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                {t.habits.limit(MAX_HABITS)}
              </Text>
            )}
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View key="dates" entering={FadeIn} exiting={FadeOut} style={styles.stepBody}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.datesTitle}
            </Text>
            <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.onboarding.datesText}
            </Text>
            {chosen.map((habit) => {
              const draft = draftOf(habit.id);
              return (
                <View key={habit.id} style={styles.dateCard}>
                  <View style={styles.dateCardHeader}>
                    <View style={[styles.swatch, { backgroundColor: habit.color }]} />
                    <Text style={styles.dateCardTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                      {habitLabel(habit)}
                    </Text>
                  </View>
                  <FieldRow label={t.onboarding.quitDate} value={formatFullDate(draft.date)} onPress={() => pickDate(habit.id)} />
                  {draft.minutes == null ? (
                    <Pressable
                      onPress={() => pickTime(habit.id)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.link} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                        {t.onboarding.addTime}
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <FieldRow label={t.onboarding.quitTime} value={formatTime(draft.minutes)} onPress={() => pickTime(habit.id)} />
                      <Pressable
                        onPress={() => updateDraft(habit.id, { minutes: null })}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.linkMuted} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                          {t.onboarding.removeTime}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 0 && <PillButton label={t.onboarding.start} onPress={() => setStep(1)} />}
        {step === 1 && (
          <>
            <PillButton label={t.onboarding.next} onPress={() => setStep(2)} disabled={chosen.length === 0} />
            <PillButton label={t.onboarding.back} variant="text" onPress={() => setStep(0)} />
          </>
        )}
        {step === 2 && (
          <>
            <PillButton label={t.onboarding.done} onPress={finish} disabled={saving} />
            <PillButton label={t.onboarding.back} variant="text" onPress={() => setStep(1)} />
          </>
        )}
      </View>

      <HabitFormSheet
        visible={form.visible}
        initial={form.editing}
        onClose={() => setForm((f) => ({ ...f, visible: false }))}
        onSubmit={submitCustom}
        onDelete={form.editing ? removeCustom : undefined}
      />
    </View>
  );
}

function HabitCard({
  habit,
  on,
  subtitle,
  onPress,
  accessibilityRole,
  accessibilityHint,
}: {
  habit: Habit;
  on: boolean;
  subtitle: string;
  onPress: () => void;
  accessibilityRole: 'switch' | 'button';
  accessibilityHint?: string;
}) {
  const color = habit.color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityRole === 'switch' ? { checked: on } : undefined}
      accessibilityLabel={`${habitName(habit)}. ${subtitle}`}
      accessibilityHint={accessibilityHint}
      style={[styles.habitCard, on ? { backgroundColor: color, borderColor: color } : styles.habitCardIdle]}
    >
      <View style={[styles.habitIcon, { backgroundColor: on ? 'rgba(255,255,255,0.18)' : colors.subtle }]}>
        <HabitIcon habit={habit} color={on ? colors.onAccent : colors.textPrimary} />
      </View>
      <View style={styles.habitText}>
        <Text style={[styles.habitTitle, on && styles.onAccent]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {habitName(habit)}
        </Text>
        <Text style={[styles.habitSub, on && styles.onAccent]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.check, on ? styles.checkOn : styles.checkOff]}>{on && <CheckIcon size={16} color={color} />}</View>
    </Pressable>
  );
}

function FieldRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}
    >
      <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {label}
      </Text>
      <Text style={styles.fieldValue} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = createStyles({
  root: { flex: 1, backgroundColor: colors.background },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.textPrimary },
  dotDone: { backgroundColor: colors.textSecondary },
  body: { flexGrow: 1, paddingHorizontal: spacing.screenX, paddingVertical: 16 },
  stepBody: { gap: 16 },
  hero: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 12 },
  heroTile: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  heroTilePlus: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 36, color: colors.textPrimary },
  lead: { fontFamily: fonts.text400, fontSize: 17, lineHeight: 24, color: colors.textSecondary },
  points: { gap: 12, marginTop: 8 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, fontFamily: fonts.text500, fontSize: 16, color: colors.textPrimary },

  habitCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radii.card, borderWidth: 2, padding: 18 },
  habitCardIdle: { backgroundColor: colors.surface, borderColor: colors.cardBorder },
  habitIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  habitText: { flex: 1, gap: 4 },
  habitTitle: { fontFamily: fonts.text700, fontSize: 18, color: colors.textPrimary },
  habitSub: { fontFamily: fonts.text400, fontSize: 14, lineHeight: 19, color: colors.textSecondary },
  onAccent: { color: colors.onAccent },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.onAccent },
  checkOff: { borderWidth: 2, borderColor: colors.border },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 18,
  },
  addText: { flex: 1, fontFamily: fonts.text600, fontSize: 16, color: colors.textPrimary },
  limit: { fontFamily: fonts.text400, fontSize: 14, color: colors.textSecondary },

  dateCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 18, gap: 10 },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  dateCardTitle: { fontFamily: fonts.text700, fontSize: 16, color: colors.textPrimary },
  field: { ...fieldRow, minHeight: 52 },
  fieldLabel: { fontFamily: fonts.text500, fontSize: 15, color: colors.textSecondary },
  fieldValue: { fontFamily: fonts.text700, fontSize: 15, color: colors.textPrimary },
  linkButton: { alignSelf: 'flex-start', minHeight: HIT, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontFamily: fonts.text600, fontSize: 15, color: colors.textPrimary, textDecorationLine: 'underline' },
  linkMuted: { fontFamily: fonts.text500, fontSize: 14, color: colors.textSecondary },
  pressed: { opacity: 0.6 },
  footer: { paddingHorizontal: spacing.screenX, gap: 6 },
});
