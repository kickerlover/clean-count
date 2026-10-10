import * as Haptics from 'expo-haptics';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { habitCountsAmount, habitKinds } from '@/domain/habits';
import { addDays } from '@/domain/localDate';
import { relapseDateRange } from '@/domain/relapse';
import { computeHabitStats } from '@/domain/stats';
import {
  RELAPSE_AMOUNT_MAX,
  RELAPSE_COUNT_MAX,
  RELAPSE_COUNT_MIN,
  RELAPSE_NOTE_MAX_LENGTH,
  type Habit,
  type LocalDate,
  type Relapse,
  type SmokingKind,
} from '@/domain/types';
import { readNow } from '@/hooks/clock';
import { t } from '@/i18n';
import { formatShortDate } from '@/i18n/format';
import { kindLabel } from '@/i18n/habits';
import { useAppStore } from '@/store/appStore';
import { colors, createStyles, fonts, HIT, MAX_FONT_SCALE_TEXT, radii } from '@/theme';

import { BottomSheet } from '../BottomSheet';
import { PillButton } from '../buttons';
import { InlineDatePicker, pick } from '../DatePicker';
import { SmokingKindIcon } from '../icons';

type DateChoice = 'today' | 'yesterday' | 'other';

interface Props {
  habit: Habit | null;
  visible: boolean;
  /** Дата, выбранная заранее (при добавлении срыва из календаря). */
  presetDate?: LocalDate | null;
  onClose: () => void;
  onSaved: (relapse: Relapse) => void;
}

export function RelapseSheet({ habit, visible, presetDate, onClose, onSaved }: Props) {
  // Новая сессия формы на каждое открытие; при закрытии форма не сбрасывается, пока окно уезжает.
  const [session, setSession] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSession(session + 1);
  }

  return (
    <BottomSheet visible={visible && !!habit} onRequestClose={onClose} accessibilityLabel={t.sheet.title}>
      {habit && <RelapseForm key={`${habit.id}-${session}`} habit={habit} presetDate={presetDate} onClose={onClose} onSaved={onSaved} />}
    </BottomSheet>
  );
}

function RelapseForm({ habit, presetDate, onClose, onSaved }: Omit<Props, 'visible' | 'habit'> & { habit: Habit }) {
  const relapses = useAppStore((s) => s.relapses);
  const addRelapse = useAppStore((s) => s.addRelapse);
  const color = habit.color;
  const kinds = habitKinds(habit);
  const hasKinds = kinds.length > 0;
  const countsAmount = habitCountsAmount(habit);
  const isMoney = countsAmount && habit.unit === 'money';

  // Значения фиксируются на момент открытия окна.
  const opened = useMemo(() => readNow(), []);
  const range = relapseDateRange(habit, opened.now, opened.tz);
  const today = opened.today;
  const yesterday = addDays(today, -1);
  const yesterdayAllowed = !!range && yesterday >= range.min;

  const initialChoice: DateChoice = !presetDate || presetDate === today ? 'today' : presetDate === yesterday ? 'yesterday' : 'other';
  const [choice, setChoice] = useState<DateChoice>(initialChoice);
  const [otherDate, setOtherDate] = useState<LocalDate | null>(initialChoice === 'other' ? presetDate! : null);
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const [kind, setKind] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanDays = useMemo(
    () => computeHabitStats(habit, relapses, opened.today).cleanDays,
    // Фраза не должна меняться, пока окно открыто.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [phraseIndex] = useState(() => Math.floor(Math.random() * t.sheet.phrases.length));
  const phrase = cleanDays === 0 ? t.sheet.phraseNoDays : t.sheet.phrases[phraseIndex]!(cleanDays);

  const date: LocalDate | null = choice === 'today' ? today : choice === 'yesterday' ? yesterday : otherDate;

  const chooseFixed = (value: Exclude<DateChoice, 'other'>) => {
    setChoice(value);
    setShowInlinePicker(false);
  };

  const chooseOther = async () => {
    if (!range) return;
    if (Platform.OS === 'ios') {
      setChoice('other');
      setOtherDate((d) => d ?? range.max);
      setShowInlinePicker(true);
      return;
    }
    const picked = await pick({ mode: 'date', value: otherDate ?? range.max, min: range.min, max: range.max });
    if (picked) {
      setOtherDate(picked);
      setChoice('other');
    }
  };

  const parsedAmount = Math.round(Number(amount.replace(',', '.')));
  const amountValid = !isMoney || (Number.isFinite(parsedAmount) && parsedAmount >= RELAPSE_COUNT_MIN && parsedAmount <= RELAPSE_AMOUNT_MAX);
  const canSave = (!hasKinds || !!kind) && !!date && amountValid && !saving;

  const save = async () => {
    if (!canSave || !date) return;
    setSaving(true);
    try {
      const { now, tz } = readNow();
      const relapse = await addRelapse(
        {
          habitId: habit.id,
          date,
          kind: hasKinds ? kind : null,
          count: !countsAmount ? 1 : isMoney ? parsedAmount : count,
          note,
        },
        now,
        tz,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaved(relapse);
      onClose();
    } catch (e) {
      console.error(e);
      setSaving(false);
      Alert.alert(t.errors.title, t.sheet.saveError);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.sheet.title}
        </Text>
        <Text style={styles.phrase} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {phrase}
        </Text>
      </View>

      {habit.preset === 'alcohol' ? (
        <Section title={t.sheet.alcoholKind}>
          <View style={styles.alcoholGrid}>
            {(kinds as readonly ('strong' | 'light')[]).map((k) => {
              const on = kind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${t.kind[k]}, ${t.kindHint[k]}`}
                  style={[styles.alcoholCard, on ? { backgroundColor: color, borderColor: color } : styles.cardIdle]}
                >
                  <Text style={[styles.alcoholTitle, on && styles.onAccent]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                    {t.kind[k]}
                  </Text>
                  <Text style={[styles.alcoholHint, on && styles.onAccent]} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                    {t.kindHint[k]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : (
        <>
          {hasKinds && (
            <Section title={habit.preset === 'smoking' ? t.sheet.smokingKind : t.sheet.kindTitle}>
              <View style={styles.smokingGrid}>
                {kinds.map((k) => {
                  const on = kind === k;
                  const label = kindLabel(k, habit);
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setKind(k)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={label}
                      style={[styles.smokingTile, on ? { backgroundColor: color, borderColor: color } : styles.cardIdle]}
                    >
                      {habit.preset === 'smoking' && <SmokingKindIcon kind={k as SmokingKind} color={on ? colors.onAccent : colors.textPrimary} />}
                      <Text
                        style={[styles.smokingLabel, on && styles.onAccent]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        maxFontSizeMultiplier={1.4}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          )}

          {isMoney ? (
            <View style={styles.counter}>
              <Text style={styles.counterLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
                {t.sheet.countLabel.money}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder={t.sheet.amountPlaceholder}
                placeholderTextColor={colors.mutedText}
                style={styles.amount}
                accessibilityLabel={t.sheet.countLabel.money}
                maxFontSizeMultiplier={1.3}
              />
            </View>
          ) : countsAmount && (
          <View style={styles.counter}>
            <Text style={styles.counterLabel} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.sheet.countLabel[habit.unit]}
            </Text>
            <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={t.sheet.countLabel[habit.unit]}
              accessibilityValue={{ min: RELAPSE_COUNT_MIN, max: RELAPSE_COUNT_MAX, now: count }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) =>
                setCount((c) => Math.min(RELAPSE_COUNT_MAX, Math.max(RELAPSE_COUNT_MIN, c + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))
              }
            >
              <StepButton label={t.sheet.countLess} symbol="−" disabled={count <= RELAPSE_COUNT_MIN} onPress={() => setCount((c) => Math.max(RELAPSE_COUNT_MIN, c - 1))} />
              <Text style={styles.counterValue} maxFontSizeMultiplier={1.3}>
                {count}
              </Text>
              <StepButton label={t.sheet.countMore} symbol="+" disabled={count >= RELAPSE_COUNT_MAX} onPress={() => setCount((c) => Math.min(RELAPSE_COUNT_MAX, c + 1))} />
            </View>
          </View>
          )}
        </>
      )}

      <Section title={t.sheet.when}>
        <View style={styles.dateChips}>
          <DateChip label={t.sheet.today} selected={choice === 'today'} onPress={() => chooseFixed('today')} />
          <DateChip label={t.sheet.yesterday} selected={choice === 'yesterday'} disabled={!yesterdayAllowed} onPress={() => chooseFixed('yesterday')} />
          <DateChip
            label={choice === 'other' && otherDate ? formatShortDate(otherDate) : t.sheet.otherDate}
            selected={choice === 'other'}
            disabled={!range || range.min === range.max}
            onPress={chooseOther}
          />
        </View>
        {Platform.OS === 'ios' && showInlinePicker && range && otherDate && (
          <View style={styles.inlinePicker}>
            <InlineDatePicker
              value={otherDate}
              min={range.min}
              max={range.max}
              onChange={(d) => {
                setOtherDate(d);
                setShowInlinePicker(false);
              }}
            />
          </View>
        )}
      </Section>

      <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.sheet.note} <Text style={styles.optional}>{t.sheet.noteOptional}</Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t.sheet.notePlaceholder}
            placeholderTextColor={colors.mutedText}
            maxLength={RELAPSE_NOTE_MAX_LENGTH}
            multiline
            style={styles.note}
            accessibilityLabel={t.sheet.note}
            maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}
          />
          {note.length > RELAPSE_NOTE_MAX_LENGTH - 50 && (
            <Text style={styles.noteCounter}>{t.sheet.noteCounter(note.length, RELAPSE_NOTE_MAX_LENGTH)}</Text>
          )}
      </View>

      <View style={styles.actions}>
        <PillButton label={t.sheet.save} onPress={save} disabled={!canSave} />
        <PillButton label={t.sheet.cancel} variant="text" onPress={onClose} />
      </View>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function DateChip({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      style={[styles.dateChip, selected && styles.dateChipOn, disabled && styles.disabled]}
    >
      <Text style={[styles.dateChipText, selected && styles.dateChipTextOn]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

function StepButton({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [styles.step, pressed && styles.stepPressed, disabled && styles.disabled]}
    >
      <Text style={styles.stepText} maxFontSizeMultiplier={1.2}>
        {symbol}
      </Text>
    </Pressable>
  );
}

const styles = createStyles({
  header: { gap: 8 },
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  phrase: { fontFamily: fonts.text400, fontSize: 15, lineHeight: 22, color: colors.textSecondary },

  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.text600, fontSize: 14, color: colors.textPrimary },
  optional: { fontFamily: fonts.text400, color: colors.textSecondary },

  cardIdle: { backgroundColor: colors.surface, borderColor: colors.cardBorder },
  onAccent: { color: colors.onAccent },

  alcoholGrid: { flexDirection: 'row', gap: 10 },
  alcoholCard: { flex: 1, minHeight: 96, borderRadius: 22, borderWidth: 2, padding: 16, gap: 6 },
  alcoholTitle: { fontFamily: fonts.text700, fontSize: 17, color: colors.textPrimary },
  alcoholHint: { fontFamily: fonts.text400, fontSize: 13, lineHeight: 17, color: colors.textPrimary, opacity: 0.85 },

  smokingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smokingTile: {
    width: '31.5%',
    flexGrow: 1,
    minHeight: 84,
    borderRadius: radii.tile,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  smokingLabel: { fontFamily: fonts.text600, fontSize: 13, color: colors.textPrimary },

  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.tile,
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 16,
  },
  counterLabel: { fontFamily: fonts.text600, fontSize: 15, color: colors.textPrimary, flexShrink: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  stepPressed: { opacity: 0.7 },
  stepText: { fontSize: 22, color: colors.textPrimary, fontFamily: fonts.text500 },
  counterValue: { minWidth: 44, textAlign: 'center', fontFamily: fonts.display700, fontSize: 20, color: colors.textPrimary },
  amount: {
    minWidth: 120,
    height: HIT,
    borderRadius: HIT / 2,
    backgroundColor: colors.subtle,
    paddingHorizontal: 16,
    textAlign: 'right',
    fontFamily: fonts.display700,
    fontSize: 18,
    color: colors.textPrimary,
  },

  dateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    minHeight: HIT,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  dateChipText: { fontFamily: fonts.text600, fontSize: 14, color: colors.textPrimary },
  dateChipTextOn: { color: colors.onDark },
  inlinePicker: { backgroundColor: colors.surface, borderRadius: radii.card, paddingHorizontal: 8 },

  note: {
    minHeight: 64,
    maxHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.text400,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  noteCounter: { alignSelf: 'flex-end', fontFamily: fonts.text400, fontSize: 12, color: colors.textSecondary },

  actions: { gap: 6 },
  disabled: { opacity: 0.35 },
});
