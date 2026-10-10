import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { firstGrapheme, validateCustomHabit, type CustomHabitError, type CustomHabitInput } from '@/domain/habits';
import { HABIT_NAME_MAX_LENGTH, HABIT_UNITS, type Habit, type HabitUnit } from '@/domain/types';
import { t } from '@/i18n';
import { colors, createStyles, CUSTOM_HABIT_COLORS, fonts, HIT, MAX_FONT_SCALE_TEXT, radii } from '@/theme';

import { BottomSheet } from '../BottomSheet';
import { PillButton } from '../buttons';
import { CheckIcon } from '../icons';

interface Props {
  visible: boolean;
  /** Привычка для правки; null — создание новой. */
  initial: Habit | null;
  onClose: () => void;
  onSubmit: (input: CustomHabitInput) => Promise<void> | void;
  /** Если задано, в форме есть кнопка удаления. */
  onDelete?: () => void;
}

/** Нижнее окно создания и правки своей привычки: название, эмодзи, цвет, единица, виды срыва. */
export function HabitFormSheet({ visible, initial, onClose, onSubmit, onDelete }: Props) {
  const [session, setSession] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSession(session + 1);
  }
  return (
    <BottomSheet visible={visible} onRequestClose={onClose} accessibilityLabel={initial ? t.habits.editTitle : t.habits.newTitle}>
      <HabitForm key={`${initial?.id ?? 'new'}-${session}`} initial={initial} onClose={onClose} onSubmit={onSubmit} onDelete={onDelete} />
    </BottomSheet>
  );
}

function HabitForm({ initial, onClose, onSubmit, onDelete }: Omit<Props, 'visible'>) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');
  const [color, setColor] = useState(initial?.color ?? CUSTOM_HABIT_COLORS[0]!);
  const [unit, setUnit] = useState<HabitUnit>(initial?.unit ?? 'times');
  const [kinds, setKinds] = useState(initial?.kinds.join(', ') ?? '');
  const [error, setError] = useState<CustomHabitError | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const input: CustomHabitInput = { name, emoji, color, unit, kinds };
    const problem = validateCustomHabit(input);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(input);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {initial ? t.habits.editTitle : t.habits.newTitle}
      </Text>

      <View style={styles.row}>
        <View style={styles.emojiBox}>
          <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.habits.emoji}
          </Text>
          <TextInput
            value={emoji}
            onChangeText={(v) => {
              setEmoji(firstGrapheme(v));
              setError(null);
            }}
            placeholder={t.habits.emojiPlaceholder}
            placeholderTextColor={colors.mutedText}
            style={[styles.emojiInput, { borderColor: error === 'emoji' ? colors.danger : colors.border }]}
            accessibilityLabel={t.habits.emoji}
            accessibilityHint={t.habits.emojiHint}
            allowFontScaling={false}
          />
        </View>
        <View style={styles.nameBox}>
          <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.habits.name}
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
            placeholder={t.habits.namePlaceholder}
            placeholderTextColor={colors.mutedText}
            maxLength={HABIT_NAME_MAX_LENGTH}
            style={[styles.input, { borderColor: error === 'name' ? colors.danger : colors.border }]}
            accessibilityLabel={t.habits.name}
            maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}
          />
        </View>
      </View>
      {error && (
        <Text style={styles.error} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {error === 'name' ? t.habits.errorName : t.habits.errorEmoji}
        </Text>
      )}

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.habits.color}
        </Text>
        <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel={t.habits.color}>
          {CUSTOM_HABIT_COLORS.map((c) => {
            const on = c === color;
            return (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={c}
                style={[styles.swatch, { backgroundColor: c }, on && styles.swatchOn]}
              >
                {on && <CheckIcon size={16} color={colors.onAccent} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.habits.unit}
        </Text>
        <View style={styles.units} accessibilityRole="radiogroup" accessibilityLabel={t.habits.unit}>
          {HABIT_UNITS.map((u) => {
            const on = u === unit;
            return (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.unitChip, on && styles.unitChipOn]}
              >
                <Text style={[styles.unitText, on && styles.unitTextOn]} maxFontSizeMultiplier={1.4}>
                  {t.units[u]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.habits.kinds} <Text style={styles.hint}>{t.habits.kindsHint}</Text>
        </Text>
        <TextInput
          value={kinds}
          onChangeText={setKinds}
          placeholder={t.habits.kindsPlaceholder}
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          accessibilityLabel={t.habits.kinds}
          maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}
        />
      </View>

      <View style={styles.actions}>
        <PillButton label={initial ? t.habits.save : t.habits.create} onPress={submit} disabled={saving} />
        {onDelete && <PillButton label={t.habits.delete} variant="text" onPress={onDelete} />}
        <PillButton label={t.habits.cancel} variant="text" onPress={onClose} />
      </View>
    </>
  );
}

const styles = createStyles({
  title: { fontFamily: fonts.display700, fontSize: 22, color: colors.textPrimary },
  row: { flexDirection: 'row', gap: 12 },
  emojiBox: { gap: 8, width: 84 },
  nameBox: { gap: 8, flex: 1 },
  field: { gap: 8 },
  label: { fontFamily: fonts.text600, fontSize: 14, color: colors.textPrimary },
  hint: { fontFamily: fonts.text400, color: colors.textSecondary },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.text400,
    fontSize: 16,
    color: colors.textPrimary,
  },
  emojiInput: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 28,
    color: colors.textPrimary,
  },
  error: { fontFamily: fonts.text500, fontSize: 13, color: colors.danger, marginTop: -8 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: colors.textPrimary },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: {
    minHeight: HIT - 4,
    paddingHorizontal: 14,
    borderRadius: radii.chip + 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  unitChipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  unitText: { fontFamily: fonts.text600, fontSize: 14, color: colors.textPrimary },
  unitTextOn: { color: colors.onDark },
  actions: { gap: 6 },
});
