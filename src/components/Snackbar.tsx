import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { t } from '@/i18n';
import { colors, createStyles, fonts, HIT, MAX_FONT_SCALE_TEXT } from '@/theme';

export const UNDO_TIMEOUT_MS = 5000;

interface Props {
  /** Уникальный ключ показа: новый ключ перезапускает таймер. */
  id: string | null;
  message: string;
  onUndo: () => void;
  onHide: () => void;
  bottom: number;
}

/** Сообщение внизу экрана с кнопкой «Отменить», пропадает через 5 секунд. */
export function Snackbar({ id, message, onUndo, onHide, bottom }: Props) {
  useEffect(() => {
    if (!id) return;
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onHide, UNDO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [id, message, onHide]);

  if (!id) return null;

  return (
    <Animated.View
      key={id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(180)}
      style={[styles.bar, { bottom }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
        {message}
      </Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        style={({ pressed }) => [styles.undo, pressed && styles.undoPressed]}
      >
        <Text style={styles.undoText} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
          {t.sheet.undo}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = createStyles({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  message: { flexShrink: 1, color: colors.onDark, fontFamily: fonts.text600, fontSize: 15 },
  undo: { minHeight: HIT, paddingHorizontal: 14, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' },
  undoPressed: { backgroundColor: 'rgba(255,246,233,0.12)' },
  undoText: { color: '#FFB38A', fontFamily: fonts.text700, fontSize: 15 },
});
