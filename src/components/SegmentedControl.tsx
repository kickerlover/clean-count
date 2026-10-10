import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { colors, createStyles, fonts, MAX_FONT_SCALE_TEXT, s } from '@/theme';

const PADDING = 4;
const GAP = 4;

export interface Segment {
  key: string;
  label: string;
}

interface Props {
  segments: readonly Segment[];
  /** Позиция индикатора (0…n−1, дробная во время свайпа) — двигается синхронно с пейджером. */
  position: SharedValue<number>;
  selectedIndex: number;
  onSelect: (index: number) => void;
  fontSize?: number;
  accessibilityLabel?: string;
}

export function SegmentedControl({ segments, position, selectedIndex, onSelect, fontSize = 15, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  const count = segments.length;
  // Масштаб считаем здесь: внутри ворклета (UI-поток) функции из других модулей недоступны.
  const gap = s(GAP);
  const segmentWidth = width > 0 ? (width - s(PADDING) * 2 - gap * (count - 1)) / count : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: position.get() * (segmentWidth + gap) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.track} onLayout={onLayout} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {segmentWidth > 0 && <Animated.View style={[styles.indicator, indicatorStyle]} />}
      {segments.map((segment, index) => (
        <Pressable
          key={segment.key}
          style={styles.segment}
          onPress={() => onSelect(index)}
          accessibilityRole="tab"
          accessibilityState={{ selected: index === selectedIndex }}
        >
          <SegmentLabel label={segment.label} index={index} position={position} fontSize={fontSize} />
        </Pressable>
      ))}
    </View>
  );
}

function SegmentLabel({ label, index, position, fontSize }: { label: string; index: number; position: SharedValue<number>; fontSize: number }) {
  const style = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs(position.get() - index));
    return { color: interpolateColor(distance, [0, 1], [colors.onDark, colors.textSecondary]) };
  });
  return (
    <Animated.Text
      style={[styles.label, { fontSize }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}
    >
      {label}
    </Animated.Text>
  );
}

const styles = createStyles({
  track: {
    flexDirection: 'row',
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.subtle,
    padding: PADDING,
    gap: GAP,
  },
  indicator: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: 20,
    backgroundColor: colors.textPrimary,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: { fontFamily: fonts.text600 },
});
