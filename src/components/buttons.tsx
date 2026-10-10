import type { ReactNode } from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, createStyles, fonts, HIT, MAX_FONT_SCALE_TEXT, s } from '@/theme';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'text';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Кнопка-пилюля: основная (тёмная, 60 pt) или текстовая (44 pt). */
export function PillButton({ label, onPress, disabled, variant = 'primary', style, accessibilityHint }: PillButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        primary ? styles.primary : styles.text,
        disabled && styles.disabled,
        pressed && !disabled && (primary ? styles.primaryPressed : styles.textPressed),
        style,
      ]}
    >
      <Text
        style={primary ? styles.primaryLabel : styles.textLabel}
        maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface IconButtonProps {
  label: string;
  onPress: () => void;
  children: ReactNode;
  variant?: 'filled' | 'plain';
  size?: number;
  disabled?: boolean;
}

/** Круглая кнопка с иконкой; подпись обязательна — её читают VoiceOver и TalkBack. */
export function IconButton({ label, onPress, children, variant = 'filled', size = 48, disabled }: IconButtonProps) {
  const px = s(size);
  const hit = s(HIT);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={px < hit ? (hit - px) / 2 : undefined}
      style={({ pressed }) => [
        styles.icon,
        { width: px, height: px, borderRadius: px / 2 },
        variant === 'filled' && styles.iconFilled,
        pressed && styles.iconPressed,
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = createStyles({
  primary: {
    minHeight: 60,
    borderRadius: 30,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  primaryLabel: { color: colors.onDark, fontFamily: fonts.text700, fontSize: 17 },
  text: {
    minHeight: HIT,
    borderRadius: HIT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  textPressed: { backgroundColor: colors.subtle },
  textLabel: { color: colors.textSecondary, fontFamily: fonts.text600, fontSize: 15 },
  disabled: { opacity: 0.35 },
  icon: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconFilled: { backgroundColor: colors.subtle },
  iconPressed: { opacity: 0.7 },
});
