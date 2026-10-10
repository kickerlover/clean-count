import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { colors, createStyles, fonts, HIT, MAX_FONT_SCALE_TEXT, radii } from '@/theme';

import { SegmentedControl, type Segment } from './SegmentedControl';

export interface HabitTab extends Segment {
  emoji?: string | null;
}

interface Props {
  tabs: readonly HabitTab[];
  position: SharedValue<number>;
  selectedIndex: number;
  onSelect: (index: number) => void;
  fontSize?: number;
  accessibilityLabel?: string;
}

/** До трёх вкладок — сегментный переключатель с индикатором; больше — прокручиваемая строка чипов. */
export function HabitTabs({ tabs, position, selectedIndex, onSelect, fontSize, accessibilityLabel }: Props) {
  const scroll = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<number, { x: number; width: number }>>({});
  const [viewportWidth, setViewportWidth] = useState(0);

  // Выбранный чип подвозится к центру строки, когда он известен по размерам.
  useEffect(() => {
    const layout = chipLayouts.current[selectedIndex];
    if (tabs.length <= 3 || !layout || !viewportWidth) return;
    scroll.current?.scrollTo({ x: Math.max(0, layout.x + layout.width / 2 - viewportWidth / 2), animated: true });
  }, [selectedIndex, tabs.length, viewportWidth]);

  const onViewportLayout = (e: LayoutChangeEvent) => setViewportWidth(e.nativeEvent.layout.width);

  if (tabs.length <= 3) {
    return (
      <SegmentedControl
        segments={tabs}
        position={position}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        fontSize={fontSize}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      onLayout={onViewportLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {tabs.map((tab, i) => {
        const on = i === selectedIndex;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(i)}
            onLayout={(e) => {
              chipLayouts.current[i] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            style={[styles.chip, on && styles.chipOn]}
          >
            {tab.emoji ? (
              <Text style={styles.emoji} allowFontScaling={false}>
                {tab.emoji}
              </Text>
            ) : null}
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE_TEXT}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.tail} />
    </ScrollView>
  );
}

const styles = createStyles({
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: HIT,
    paddingHorizontal: 14,
    borderRadius: radii.chip + 10,
    backgroundColor: colors.subtle,
  },
  chipOn: { backgroundColor: colors.textPrimary },
  emoji: { fontSize: 16 },
  label: { fontFamily: fonts.text600, fontSize: 15, color: colors.textSecondary, maxWidth: 160 },
  labelOn: { color: colors.onDark },
  tail: { width: 4 },
});
