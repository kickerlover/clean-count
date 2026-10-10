import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { SmokingKind } from '@/domain/types';
import { s } from '@/theme';

interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

// Размер иконки задаётся для 14 Pro Max и масштабируется вместе с остальным интерфейсом.
const base = (size: number) => ({ width: s(size), height: s(size), viewBox: '0 0 24 24', fill: 'none' });
const stroke = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function CalendarIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={5} width={18} height={16} rx={3} {...stroke(color, strokeWidth)} />
      <Path d="M3 10h18M8 3v4M16 3v4" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function SettingsIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...stroke(color, strokeWidth)} />
      <Circle cx={16} cy={7} r={2.2} {...stroke(color, strokeWidth)} />
      <Circle cx={8} cy={17} r={2.2} {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function TrophyIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 22, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M15 5l-7 7 7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 22, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M9 5l7 7-7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 5v14M5 12h14" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function GlassIcon({ size = 28, color, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3zM12 15v6M8 21h8M7.5 7h9" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

/** Иконки видов курения — пути из макета «Срыв — курение». */
const SMOKING_PATHS: Record<SmokingKind, string> = {
  cigarette: 'M2 14h15v4H2z M17 14h4v4h-4z M17 10c0-2 2-2 2-4 M20 10c0-2 1.5-2 1.5-4',
  hookah: 'M12 2v5 M9 7h6 M10 7l-2.5 7a4.5 4.5 0 0 0 9 0L14 7 M8 22h8 M12 18.5V22 M16.5 13H20V7',
  vape: 'M9 2h6v20H9z M9 7h6 M12 11v4',
  heated: 'M7 5h10v16H7z M12 1v4 M10 10h4',
  cigar: 'M3 15l13-5 3 3-13 5z M16 10l3 3 M20 7c1-1 1-2 0-3',
  other: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M8 12h.01 M12 12h.01 M16 12h.01',
};

export function SmokingKindIcon({ kind, size = 26, color, strokeWidth = 1.7 }: IconProps & { kind: SmokingKind }) {
  return (
    <Svg {...base(size)}>
      <Path d={SMOKING_PATHS[kind]} {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

