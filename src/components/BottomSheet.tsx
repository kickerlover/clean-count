import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { t } from '@/i18n';
import { colors, createStyles, radii, s } from '@/theme';

const OPEN_MS = 280;
const CLOSE_MS = 220;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

interface Props {
  visible: boolean;
  /** Пользователь закрывает окно: свайп вниз, тап по фону, «Назад» на Android. */
  onRequestClose: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
}

/**
 * Нижнее окно поверх экрана. Закрывается свайпом вниз за «ручку» и заголовок,
 * тапом по фону или системной кнопкой «Назад». Анимации на UI-потоке.
 */
export function BottomSheet({ visible, onRequestClose, children, accessibilityLabel }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const offset = useSharedValue(height);
  const scrim = useSharedValue(0);

  // Монтируем Modal сразу при открытии; размонтируем — после анимации закрытия.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      offset.set(height);
      offset.set(withTiming(0, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
      scrim.set(withTiming(1, { duration: OPEN_MS }));
    } else {
      scrim.set(withTiming(0, { duration: CLOSE_MS }));
      offset.set(
        withTiming(height, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- анимация запускается только сменой visible
  }, [visible]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      offset.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onRequestClose);
      } else {
        offset.set(withTiming(0, { duration: 180 }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onRequestClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel={t.sheet.close}
          />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoider} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { maxHeight: height - insets.top - s(12) }, sheetStyle]}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.handleArea} accessible={false}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, s(16)) + s(12) }]}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = createStyles({
  root: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 14 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  content: { paddingHorizontal: 20, gap: 20 },
});
