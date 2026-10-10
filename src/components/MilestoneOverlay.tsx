import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import type { Habit } from '@/domain/types';
import { t } from '@/i18n';
import { colors, createStyles, fonts, MAX_FONT_SCALE_TEXT, s } from '@/theme';

interface Props {
  habit: Habit | null;
  milestone: number | null;
  onClose: () => void;
}

/** Полноэкранное поздравление с вехой; закрывается тапом в любом месте. */
export function MilestoneOverlay({ habit, milestone, onClose }: Props) {
  const visible = !!habit && milestone != null;

  useEffect(() => {
    if (visible) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {visible && (
        <Pressable
          style={[styles.root, { backgroundColor: habit.color }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`${t.milestone.title} ${milestone} ${t.milestone.days(milestone, habit)}. ${t.milestone.hint}`}
        >
          <Decor />
          <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
            <Text style={styles.kicker} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.milestone.title}
            </Text>
            <Animated.Text
              entering={ZoomIn.springify().damping(12)}
              style={styles.number}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1}
            >
              {milestone}
            </Animated.Text>
            <Text style={styles.days} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.milestone.days(milestone, habit)}
            </Text>
            <Text style={styles.text} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {t.milestone.text(milestone)}
            </Text>
          </Animated.View>
          <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
            {t.milestone.hint}
          </Text>
        </Pressable>
      )}
    </Modal>
  );
}

function Decor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.circle, { top: s(-80), right: s(-60), width: s(260), height: s(260) }]} />
      <View style={[styles.circle, { bottom: s(60), left: s(-90), width: s(220), height: s(220) }]} />
    </View>
  );
}

const styles = createStyles({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 64 },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  content: { gap: 12 },
  kicker: { color: colors.onAccent, fontFamily: fonts.text600, fontSize: 17, opacity: 0.9 },
  number: {
    color: colors.onAccent,
    fontFamily: fonts.display800,
    fontSize: 160,
    lineHeight: 160,
    letterSpacing: -6,
    includeFontPadding: false,
  },
  days: { color: colors.onAccent, fontFamily: fonts.display700, fontSize: 26, lineHeight: 32 },
  text: { color: colors.onAccent, fontFamily: fonts.text400, fontSize: 17, lineHeight: 24, opacity: 0.9, marginTop: 8 },
  hint: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.onAccent,
    fontFamily: fonts.text500,
    fontSize: 15,
    opacity: 0.8,
  },
});
