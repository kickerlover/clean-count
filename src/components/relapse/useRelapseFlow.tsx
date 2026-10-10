import { useCallback, useState } from 'react';

import type { HabitId, LocalDate, Relapse } from '@/domain/types';
import { t } from '@/i18n';
import { useAppStore } from '@/store/appStore';

import { Snackbar } from '../Snackbar';
import { RelapseSheet } from './RelapseSheet';

interface Target {
  habitId: HabitId;
  presetDate: LocalDate | null;
}

/**
 * Окно записи срыва и сообщение «Срыв записан · Отменить». Запись сохраняется
 * в базу сразу; «Отменить» удаляет её, и показатели возвращаются к прежним.
 */
export function useRelapseFlow(snackbarBottom: number) {
  const habits = useAppStore((s) => s.habits);
  const removeRelapse = useAppStore((s) => s.removeRelapse);
  const [target, setTarget] = useState<Target | null>(null);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState<Relapse | null>(null);

  const open = useCallback((habitId: HabitId, presetDate: LocalDate | null = null) => {
    setTarget({ habitId, presetDate });
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);
  const hideSnackbar = useCallback(() => setSaved(null), []);

  const undo = useCallback(() => {
    if (!saved) return;
    setSaved(null);
    removeRelapse(saved.id).catch(console.error);
  }, [removeRelapse, saved]);

  const elements = (
    <>
      <RelapseSheet
        habit={target ? (habits.find((h) => h.id === target.habitId) ?? null) : null}
        visible={visible}
        presetDate={target?.presetDate}
        onClose={close}
        onSaved={setSaved}
      />
      <Snackbar id={saved?.id ?? null} message={t.sheet.saved} onUndo={undo} onHide={hideSnackbar} bottom={snackbarBottom} />
    </>
  );

  return { open, elements, sheetVisible: visible };
}
