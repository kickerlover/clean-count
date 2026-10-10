import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { fromParts, toParts } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';
import { t } from '@/i18n';
import { colors, createStyles, radii, s } from '@/theme';

import { PillButton } from './buttons';

/** Системный пикер работает с Date в поясе устройства — переводим в календарную дату и обратно. */
export function localDateToPickerDate(date: LocalDate, minutes = 12 * 60): Date {
  const { year, month, day } = toParts(date);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

export function pickerDateToLocalDate(value: Date): LocalDate {
  return fromParts({ year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() });
}

export type PickRequest =
  | { mode: 'date'; value: LocalDate; min?: LocalDate; max?: LocalDate }
  | { mode: 'time'; value: number };

export type PickResult<R extends PickRequest> = R extends { mode: 'date' } ? LocalDate : number;

interface PendingPick {
  request: PickRequest;
  resolve: (value: Date | null) => void;
}

const usePickerStore = create<{ pending: PendingPick | null }>(() => ({ pending: null }));

function toPickerProps(request: PickRequest) {
  if (request.mode === 'date') {
    return {
      mode: 'date' as const,
      value: localDateToPickerDate(request.value),
      minimumDate: request.min ? localDateToPickerDate(request.min, 0) : undefined,
      maximumDate: request.max ? localDateToPickerDate(request.max, 23 * 60 + 59) : undefined,
    };
  }
  const now = new Date();
  return {
    mode: 'time' as const,
    value: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(request.value / 60), request.value % 60),
  };
}

function fromPicker(request: PickRequest, value: Date): LocalDate | number {
  return request.mode === 'date' ? pickerDateToLocalDate(value) : value.getHours() * 60 + value.getMinutes();
}

/**
 * Открывает системный выбор даты или времени. На Android — нативный диалог,
 * на iOS — нижнее окно с системным календарём (его рисует PickerHost).
 * Возвращает null, если пользователь закрыл выбор.
 */
export function pick<R extends PickRequest>(request: R): Promise<PickResult<R> | null> {
  return new Promise((resolve) => {
    const done = (value: Date | null) => resolve(value ? (fromPicker(request, value) as PickResult<R>) : null);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        ...toPickerProps(request),
        is24Hour: true,
        firstDayOfWeek: 1,
        onValueChange: (_event, date) => done(date),
        onDismiss: () => done(null),
      });
      return;
    }
    usePickerStore.getState().pending?.resolve(null);
    usePickerStore.setState({ pending: { request, resolve: done } });
  });
}

/** Хост для iOS-пикера; монтируется один раз в корневом layout. */
export function PickerHost() {
  const pending = usePickerStore((s) => s.pending);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Date | null>(null);

  if (Platform.OS === 'android') return null;

  const close = (value: Date | null) => {
    pending?.resolve(value);
    usePickerStore.setState({ pending: null });
    setDraft(null);
  };

  const props = pending ? toPickerProps(pending.request) : null;

  return (
    <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => close(null)}>
      <Pressable style={styles.scrim} onPress={() => close(null)} accessibilityLabel={t.sheet.cancel} accessibilityRole="button" />
      {props && (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + s(16) }]}>
          <DateTimePicker
            {...props}
            value={draft ?? props.value}
            display={props.mode === 'date' ? 'inline' : 'spinner'}
            locale="ru-RU"
            accentColor={colors.textPrimary}
            themeVariant="light"
            onValueChange={(_event, date) => setDraft(date)}
          />
          <PillButton label={t.pickerDone} onPress={() => close(draft ?? props.value)} />
          <PillButton label={t.sheet.cancel} variant="text" onPress={() => close(null)} />
        </View>
      )}
    </Modal>
  );
}

interface InlineDatePickerProps {
  value: LocalDate;
  min: LocalDate;
  max: LocalDate;
  onChange: (date: LocalDate) => void;
}

/** Встроенный календарь для iOS — используется внутри окна записи срыва. */
export function InlineDatePicker({ value, min, max, onChange }: InlineDatePickerProps) {
  return (
    <DateTimePicker
      mode="date"
      display="inline"
      locale="ru-RU"
      themeVariant="light"
      accentColor={colors.textPrimary}
      value={localDateToPickerDate(value)}
      minimumDate={localDateToPickerDate(min, 0)}
      maximumDate={localDateToPickerDate(max, 23 * 60 + 59)}
      onValueChange={(_event, date) => onChange(pickerDateToLocalDate(date))}
    />
  );
}

const styles = createStyles({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
});
