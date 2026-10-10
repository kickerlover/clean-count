import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { reachedMilestones } from '@/domain/milestones';
import { emptyHabit, type Habit, type Relapse } from '@/domain/types';
import { ClockProvider } from '@/hooks/clock';
import { setLanguage, t } from '@/i18n';
import { useAppStore } from '@/store/appStore';

import AchievementsScreen from '@/app/achievements';
import CalendarScreen from '@/app/calendar';
import MainScreen from '@/app/main';
import OnboardingScreen from '@/app/onboarding';
import SettingsScreen from '@/app/settings';

jest.mock('@/db/repo', () => ({
  loadSnapshot: jest.fn(),
  saveHabit: jest.fn(() => Promise.resolve()),
  completeOnboarding: jest.fn(() => Promise.resolve()),
  insertRelapse: jest.fn(() => Promise.resolve()),
  deleteRelapse: jest.fn(() => Promise.resolve()),
  saveSetting: jest.fn(() => Promise.resolve()),
  deleteHabit: jest.fn(() => Promise.resolve()),
  resetAll: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/db/database', () => ({ isExcludedFromBackup: () => false, initDatabase: jest.fn(() => Promise.resolve()) }));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissAll: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));

jest.mock('@/components/DatePicker', () => ({
  ...jest.requireActual<typeof import('@/components/DatePicker')>('@/components/DatePicker'),
  pick: jest.fn((request: { mode: 'date' | 'time' }) => Promise.resolve(request.mode === 'date' ? '2026-09-28' : 0)),
}));

const repo = jest.requireMock<Record<string, jest.Mock>>('@/db/repo');
const mockPick = jest.requireMock<{ pick: jest.Mock }>('@/components/DatePicker').pick;
const mockRouter = jest.requireMock<{ router: Record<string, jest.Mock> }>('expo-router').router;

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderScreen(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ClockProvider>{ui}</ClockProvider>
    </SafeAreaProvider>,
  );
}

// Данные из примера ТЗ: отказ от алкоголя 3 марта, три срыва, «сегодня» — 28 сентября 2026, 05:17 МСК.
// Чистых дней с последнего срыва: алкоголь — 42, курение — 35; все достигнутые вехи уже показаны.
const alcohol: Habit = {
  ...emptyHabit('alcohol'),
  enabled: true,
  quitAt: '2026-03-03T00:00:00+03:00',
  milestonesEarned: reachedMilestones(42),
  celebratedSince: '2026-08-17',
  celebratedUpTo: 30,
};
const smoking: Habit = {
  ...emptyHabit('smoking'),
  enabled: true,
  quitAt: '2026-08-10T00:00:00+03:00',
  milestonesEarned: reachedMilestones(35),
  celebratedSince: '2026-08-24',
  celebratedUpTo: 30,
};
const relapses: Relapse[] = [
  { id: 'a', habitId: 'alcohol', date: '2026-04-10', createdAt: '2026-04-10T22:00:00+03:00', kind: 'strong', count: 1, note: null },
  { id: 'b', habitId: 'alcohol', date: '2026-06-05', createdAt: '2026-06-06T09:00:00+03:00', kind: 'light', count: 1, note: null },
  { id: 'c', habitId: 'alcohol', date: '2026-08-16', createdAt: '2026-08-18T10:00:00+03:00', kind: 'light', count: 1, note: 'День рождения друга' },
  { id: 'd', habitId: 'smoking', date: '2026-08-16', createdAt: '2026-08-16T20:00:00+03:00', kind: 'cigarette', count: 2, note: null },
  { id: 'e', habitId: 'smoking', date: '2026-08-23', createdAt: '2026-08-24T09:00:00+03:00', kind: 'hookah', count: 1, note: null },
];

function seed(habits: { alcohol: Habit; smoking: Habit; customs?: Habit[] }, list: Relapse[] = relapses) {
  useAppStore.setState({
    status: 'ready',
    habits: [habits.alcohol, habits.smoking, ...(habits.customs ?? [])],
    relapses: list,
    settings: { onboarded: true, lastScreen: 'alcohol', excludeFromBackup: false, language: 'ru' },
  });
}

const habitOf = (habits: Habit[], id: string): Habit => habits.find((h) => h.id === id)!;

/** Своя привычка «Кофе» с двумя видами срыва; отказ 1 сентября, срывов нет. */
const coffee: Habit = {
  id: 'c0ffee00-0000-4000-8000-000000000001',
  preset: null,
  name: 'Кофе',
  emoji: '☕️',
  color: '#B45309',
  unit: 'servings',
  kinds: ['Эспрессо', 'Латте'],
  order: 2,
  enabled: true,
  quitAt: '2026-09-01T00:00:00+03:00',
  milestonesEarned: [],
  celebratedSince: '2026-09-01',
  celebratedUpTo: 21,
};

function seedFresh() {
  useAppStore.setState({
    status: 'ready',
    habits: [emptyHabit('alcohol'), emptyHabit('smoking')],
    relapses: [],
    settings: { onboarded: false, lastScreen: null, excludeFromBackup: false, language: 'ru' },
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-28T05:17:00+03:00') });
  jest.clearAllMocks();
  mockParams = {};
});

afterEach(() => {
  jest.useRealTimers();
  setLanguage('ru');
});

describe('главный экран', () => {
  it('показывает показатели по правилам ТЗ', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<MainScreen />);

    // Основной счётчик — общий счёт с даты отказа; цель каждые 5 дней по чистым дням с последнего срыва.
    expect(screen.getByLabelText('209 дней с начала, с 3 марта')).toBeTruthy();
    expect(screen.getByText('6 месяцев 25 дней')).toBeTruthy();
    expect(screen.getByText('с 3 марта', { includeHiddenElements: true })).toBeTruthy();
    // Алкоголь: 42 дня → цель 45, ещё 3. Курение: 35 дней → тоже 45, ещё 10.
    expect(screen.getAllByText('Цель: 45 дней')).toHaveLength(2);
    expect(screen.getByText('ещё 3')).toBeTruthy();
    expect(screen.getByText('ещё 10')).toBeTruthy();
    // Плитки: чистых дней всего и чистых дней с последнего срыва (серия).
    expect(screen.getByLabelText('206 чистых дней всего')).toBeTruthy();
    expect(screen.getByLabelText('42 чистых дня с последнего срыва')).toBeTruthy();
    expect(screen.getByText('Крепкое · 1')).toBeTruthy();
    expect(screen.getByText('Некрепкое · 2')).toBeTruthy();
    // Курение: 49 дней с 10 августа, 47 чистых, серия 35; только встречавшиеся виды.
    expect(screen.getByLabelText('49 дней с начала, с 10 августа')).toBeTruthy();
    expect(screen.getByText('1 месяц 18 дней')).toBeTruthy();
    expect(screen.getByLabelText('47 чистых дней всего')).toBeTruthy();
    expect(screen.getByLabelText('35 чистых дней с последнего срыва')).toBeTruthy();
    expect(screen.getByText('Сигарета · 1')).toBeTruthy();
    expect(screen.getByText('Кальян · 1')).toBeTruthy();
    expect(screen.queryByText('Вейп · 0')).toBeNull();
    // Переключатель виден, когда включены обе привычки.
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    // Входы в достижения: кнопка в шапке и полоса цели.
    expect(screen.getByRole('button', { name: 'Достижения' })).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: /Следующая цель 45 дней.*открыть достижения/ })[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/achievements', params: { habit: 'alcohol' } });
  });

  it('с одной привычкой переключатель скрыт', async () => {
    seed({ alcohol, smoking: { ...smoking, enabled: false } });
    await renderScreen(<MainScreen />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('Чистый счёт')).toBeTruthy();
  });

  it('без срывов показывает «Срывов нет»', async () => {
    seed({ alcohol, smoking }, []);
    await renderScreen(<MainScreen />);
    expect(screen.getAllByText('Срывов нет').length).toBeGreaterThan(0);
  });

  it('запись срыва и отмена в течение 5 секунд', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<MainScreen />);

    await fireEvent.press(screen.getByText('Был срыв'));
    expect(screen.getByText('Записать срыв')).toBeTruthy();
    expect(screen.getByText(/206 чистых дней/)).toBeTruthy();

    // Тип не выбран — «Записать» неактивна.
    const save = screen.getByRole('button', { name: 'Записать' });
    expect(save).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Крепкое, водка, коньяк, виски' }));
    await fireEvent.changeText(screen.getByLabelText('Заметка'), 'Праздник');
    await fireEvent.press(screen.getByRole('button', { name: 'Записать' }));

    expect(repo.insertRelapse).toHaveBeenCalledWith(
      expect.objectContaining({ habitId: 'alcohol', kind: 'strong', date: '2026-09-28', note: 'Праздник', count: 1 }),
    );
    expect(screen.getByText('Крепкое · 2')).toBeTruthy();
    expect(screen.getByText('Срыв записан')).toBeTruthy();
    // Срыв сегодня: дни с последнего срыва и цель начинаются заново, общий счёт не меняется.
    expect(screen.getByLabelText('0 чистых дней с последнего срыва')).toBeTruthy();
    expect(screen.getByLabelText('209 дней с начала, с 3 марта')).toBeTruthy();
    expect(screen.getByText('Цель: 5 дней')).toBeTruthy();

    await fireEvent.press(screen.getByText('Отменить'));
    expect(repo.deleteRelapse).toHaveBeenCalled();
    expect(screen.getByText('Крепкое · 1')).toBeTruthy();
    expect(screen.getByLabelText('42 чистых дня с последнего срыва')).toBeTruthy();
  });

  it('сообщение о записи пропадает через 5 секунд', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<MainScreen />);
    await fireEvent.press(screen.getByText('Был срыв'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Некрепкое, пиво, вино, сидр' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Записать' }));
    expect(screen.getByText('Срыв записан')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(5100);
    });
    expect(screen.queryByText('Срыв записан')).toBeNull();
  });

  it('поздравляет с непоказанной вехой один раз', async () => {
    seed({ alcohol: { ...alcohol, milestonesEarned: [], celebratedSince: null, celebratedUpTo: 0 }, smoking });
    await renderScreen(<MainScreen />);
    expect(screen.getByText('Новая веха!')).toBeTruthy();
    // 42 чистых дня с последнего срыва: последняя достигнутая веха — 30.
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('дней без алкоголя')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Новая веха!/ }));
    expect(repo.saveHabit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alcohol', celebratedSince: '2026-08-17', celebratedUpTo: 30, milestonesEarned: reachedMilestones(42) }),
    );
    expect(screen.queryByText('Новая веха!')).toBeNull();
  });

  it('в новой серии после срыва те же вехи поздравляются снова', async () => {
    // Все вехи до 100 дней заработаны в прошлой серии (с 1 мая), текущая серия с 17 августа — 42 дня.
    seed({ alcohol: { ...alcohol, milestonesEarned: reachedMilestones(100), celebratedSince: '2026-05-01', celebratedUpTo: 90 }, smoking });
    await renderScreen(<MainScreen />);
    expect(screen.getByText('Новая веха!')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Новая веха!/ }));
    expect(repo.saveHabit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alcohol', celebratedSince: '2026-08-17', celebratedUpTo: 30, milestonesEarned: reachedMilestones(100) }),
    );
  });
});

describe('достижения', () => {
  it('сводка, главные рубежи и сетка вех по выбранной привычке', async () => {
    seed({ alcohol, smoking });
    mockParams = { habit: 'alcohol' };
    await renderScreen(<AchievementsScreen />);
    // 42 чистых дня с последнего срыва: вехи 5, 10, 14, 21, 30 — пять достижений.
    expect(screen.getByText('достижений')).toBeTruthy();
    expect(screen.getByText('Последнее — 30 дней без алкоголя')).toBeTruthy();
    expect(screen.getByText('В текущей серии — 5 вех')).toBeTruthy();
    expect(screen.getByText('Следующая цель — 45 дней, ещё 3 дня')).toBeTruthy();
    expect(screen.getByLabelText('Месяц, 30 дней, достигнуто')).toBeTruthy();
    expect(screen.getByLabelText('Три месяца, 90 дней, ещё 48 дней')).toBeTruthy();
    expect(screen.getByLabelText('Год, 365 дней, ещё 323 дня')).toBeTruthy();
    expect(screen.getByLabelText('30 дней: достигнуто в текущей серии')).toBeTruthy();
    expect(screen.getByLabelText('45 дней: текущая цель')).toBeTruthy();
    expect(screen.queryByLabelText(/^60 дней/)).toBeNull();
    expect(screen.queryByText(/в прошлых сериях/)).toBeNull();
  });

  it('достижения остаются после срыва', async () => {
    const relapsedToday: Relapse = { id: 'z', habitId: 'alcohol', date: '2026-09-28', createdAt: '2026-09-28T05:00:00+03:00', kind: 'light', count: 1, note: null };
    seed({ alcohol, smoking }, [...relapses, relapsedToday]);
    mockParams = { habit: 'alcohol' };
    await renderScreen(<AchievementsScreen />);
    expect(screen.getByText('В текущей серии — 0 вех')).toBeTruthy();
    expect(screen.getByText('Следующая цель — 5 дней, ещё 5 дней')).toBeTruthy();
    // В сетке только цель, прошлая серия свёрнута в строку.
    expect(screen.getByLabelText('5 дней: текущая цель')).toBeTruthy();
    expect(screen.queryByLabelText(/^10 дней/)).toBeNull();
    expect(screen.getByText('Ещё 5 вех получено в прошлых сериях')).toBeTruthy();
    expect(screen.getByLabelText('Месяц, 30 дней, получено раньше')).toBeTruthy();
  });

  it('без достижений показывает подсказку', async () => {
    seed({ alcohol: { ...alcohol, quitAt: '2026-09-26T00:00:00+03:00', milestonesEarned: [], celebratedSince: null, celebratedUpTo: 0 }, smoking }, []);
    mockParams = { habit: 'alcohol' };
    await renderScreen(<AchievementsScreen />);
    expect(screen.getByText('Пока нет достижений')).toBeTruthy();
    expect(screen.getByText('Следующая цель — 5 дней, ещё 3 дня')).toBeTruthy();
  });
});

describe('язык интерфейса', () => {
  it('переключатель в настройках меняет язык, запоминает выбор и перерисовывает экран', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<SettingsScreen />);
    expect(screen.getByText('Настройки')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'English' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'English' }));
    expect(useAppStore.getState().settings.language).toBe('en');
    expect(repo.saveSetting).toHaveBeenCalledWith('language', 'en');
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Reset all data')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Русский' }));
    expect(screen.getByText('Настройки')).toBeTruthy();
  });

  it('главный экран на английском', async () => {
    seed({ alcohol, smoking });
    useAppStore.getState().setLanguage('en');
    await renderScreen(<MainScreen />);
    expect(screen.getByLabelText('209 days since start, since 3 March')).toBeTruthy();
    expect(screen.getByText('6 months 25 days')).toBeTruthy();
    expect(screen.getByLabelText('206 clean days in total')).toBeTruthy();
    expect(screen.getByLabelText('42 clean days since the last relapse')).toBeTruthy();
    expect(screen.getAllByText('Goal: 45 days')).toHaveLength(2);
    expect(screen.getByText('I relapsed')).toBeTruthy();
  });

  it('сохранённый язык применяется при загрузке', async () => {
    repo.loadSnapshot!.mockResolvedValueOnce({
      habits: [alcohol, smoking],
      relapses,
      settings: { onboarded: true, lastScreen: 'alcohol', excludeFromBackup: false, language: 'en' },
    });
    await useAppStore.getState().load('2026-09-28');
    expect(useAppStore.getState().settings.language).toBe('en');
    expect(t.settings.title).toBe('Settings');
  });
});

describe('загрузка данных', () => {
  const legacySnapshot = () => ({
    habits: [
      { ...alcohol, milestonesEarned: [1, 3, 7, 14, 30], celebratedSince: null, celebratedUpTo: 0 },
      { ...smoking, milestonesEarned: [1, 3, 7, 14, 30], celebratedSince: null, celebratedUpTo: 0 },
    ],
    relapses,
    settings: { onboarded: true, lastScreen: 'alcohol', excludeFromBackup: false, language: 'ru' },
  });

  it('старые вехи по серии переводятся на вехи по общему счёту и сохраняются', async () => {
    repo.loadSnapshot!.mockResolvedValueOnce(legacySnapshot());
    await useAppStore.getState().load('2026-09-28');
    const state = useAppStore.getState();
    expect(state.status).toBe('ready');
    expect(habitOf(state.habits, 'alcohol')).toMatchObject({ milestonesEarned: reachedMilestones(42), celebratedSince: '2026-08-17', celebratedUpTo: 30 });
    expect(habitOf(state.habits, 'smoking')).toMatchObject({ milestonesEarned: reachedMilestones(35), celebratedSince: '2026-08-24', celebratedUpTo: 30 });
    expect(repo.saveHabit).toHaveBeenCalledWith(expect.objectContaining({ id: 'alcohol', milestonesEarned: reachedMilestones(42) }));
    // Поздравления задним числом нет.
    await renderScreen(<MainScreen />);
    expect(screen.queryByText('Новая веха!')).toBeNull();
  });

  it('если запись переведённых вех не удалась, приложение всё равно загружается', async () => {
    repo.loadSnapshot!.mockResolvedValueOnce(legacySnapshot());
    repo.saveHabit!.mockRejectedValueOnce(new Error('disk full'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await useAppStore.getState().load('2026-09-28');
    expect(useAppStore.getState().status).toBe('ready');
    expect(habitOf(useAppStore.getState().habits, 'alcohol').milestonesEarned).toEqual(reachedMilestones(42));
    error.mockRestore();
  });

  it('вехи, достигнутые пока приложение не открывали, записываются в достижения без поздравления задним числом', async () => {
    // В прошлой серии заработано 5 и 10, в текущей (42 дня) поздравляли только до 5.
    repo.loadSnapshot!.mockResolvedValueOnce({
      ...legacySnapshot(),
      habits: [{ ...alcohol, milestonesEarned: [5, 10], celebratedSince: '2026-08-17', celebratedUpTo: 5 }, smoking],
    });
    await useAppStore.getState().load('2026-09-28');
    expect(habitOf(useAppStore.getState().habits, 'alcohol')).toMatchObject({ milestonesEarned: reachedMilestones(42), celebratedUpTo: 5 });
  });

  it('вехи новой схемы при загрузке не трогаются', async () => {
    repo.loadSnapshot!.mockResolvedValueOnce({ ...legacySnapshot(), habits: [alcohol, smoking] });
    await useAppStore.getState().load('2026-09-28');
    expect(repo.saveHabit).not.toHaveBeenCalled();
  });
});

describe('календарь', () => {
  it('открывается на текущем месяце с фильтром экрана', async () => {
    seed({ alcohol, smoking });
    mockParams = { filter: 'smoking' };
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText('Сентябрь 2026')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[2]!).toBeSelected();
    // Сегодня выбран по умолчанию.
    expect(screen.getByText('28 сентября, понедельник')).toBeTruthy();
    expect(screen.getByText('Чистый день, срывов не было.')).toBeTruthy();
  });

  it('показывает срывы дня и удаляет запись по долгому нажатию', async () => {
    jest.setSystemTime(new Date('2026-08-25T12:00:00+03:00'));
    seed({ alcohol, smoking });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText('Август 2026')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('16 августа, срыв: Алкоголь, Курение'));
    expect(screen.getByText('16 августа, воскресенье')).toBeTruthy();
    expect(screen.getByText('Алкоголь · некрепкое')).toBeTruthy();
    expect(screen.getByText('День рождения друга')).toBeTruthy();
    expect(screen.getByText('Курение · сигарета ×2')).toBeTruthy();

    const { Alert } = jest.requireActual<typeof import('react-native')>('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await fireEvent(screen.getByLabelText('Алкоголь · некрепкое. День рождения друга'), 'longPress');
    expect(alert).toHaveBeenCalled();
    expect(repo.deleteRelapse).toHaveBeenCalledWith('c');
    expect(screen.queryByText('Алкоголь · некрепкое')).toBeNull();
    alert.mockRestore();
  });

  it('стрелки листают месяцы в пределах от даты отказа до текущего', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByLabelText('Следующий месяц')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Предыдущий месяц'));
    expect(screen.getByText('Август 2026')).toBeTruthy();
    expect(screen.getByText('Выберите день')).toBeTruthy();
    for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByLabelText('Предыдущий месяц'));
    expect(screen.getByText('Март 2026')).toBeTruthy();
    expect(screen.getByLabelText('Предыдущий месяц')).toBeDisabled();
  });

  it('итог месяца учитывает фильтр', async () => {
    jest.setSystemTime(new Date('2026-08-25T12:00:00+03:00'));
    seed({ alcohol, smoking });
    mockParams = { filter: 'alcohol' };
    await renderScreen(<CalendarScreen />);
    expect(screen.getByLabelText('1 срыв по алкоголю за месяц')).toBeTruthy();
    expect(screen.queryByLabelText(/по курению за месяц/)).toBeNull();
  });
});

describe('первый запуск', () => {
  it('настройка за три экрана', async () => {
    seedFresh();
    await renderScreen(<OnboardingScreen />);

    expect(screen.getByText('Считаем дни без алкоголя, курения и любой другой привычки. Срыв не обнуляет ваш прогресс.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Начать'));

    const next = screen.getByRole('button', { name: 'Далее' });
    expect(next).toBeDisabled();
    await fireEvent.press(screen.getByRole('switch', { name: /^Курение/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Далее' }));

    expect(screen.getByText('Когда вы отказались?')).toBeTruthy();
    expect(screen.getByText('28 сентября 2026')).toBeTruthy();
    await fireEvent.press(screen.getByText('Готово'));

    expect(repo.completeOnboarding).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'alcohol', enabled: false, quitAt: null }),
      expect.objectContaining({ id: 'smoking', enabled: true, quitAt: '2026-09-28T00:00:00+03:00' }),
    ]);
    expect(mockRouter.replace).toHaveBeenCalledWith('/main');
    expect(useAppStore.getState().settings.lastScreen).toBe('smoking');
  });
});

describe('свои привычки', () => {
  it('на главном экране карточки своей привычки в её цвете, срыв без вида и с количеством порций', async () => {
    seed({ alcohol, smoking, customs: [coffee] });
    useAppStore.getState().setLastScreen(coffee.id);
    await renderScreen(<MainScreen />);
    // Три привычки — сегментный переключатель; текущая — кофе.
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Кофе' })).toBeSelected();
    expect(screen.getByLabelText('27 дней с начала, с 1 сентября')).toBeTruthy();
    expect(screen.getByLabelText('27 чистых дней без срывов')).toBeTruthy();

    await fireEvent.press(screen.getByText('Был срыв'));
    expect(screen.getByText('Что это было')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Латте' })).toBeTruthy();
    expect(screen.getByText('Сколько порций')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Записать' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Латте' }));
    await fireEvent.press(screen.getByLabelText('Больше'));
    await fireEvent.press(screen.getByRole('button', { name: 'Записать' }));
    expect(repo.insertRelapse).toHaveBeenCalledWith(
      expect.objectContaining({ habitId: coffee.id, kind: 'Латте', count: 2, date: '2026-09-28' }),
    );
    expect(screen.getByText('Латте · 1')).toBeTruthy();
  });

  it('привычка без видов срыва: вид не спрашивается, деньги вводятся суммой', async () => {
    const money: Habit = { ...coffee, id: 'c0ffee00-0000-4000-8000-000000000002', name: 'Ставки', emoji: '🎰', unit: 'money', kinds: [] };
    seed({ alcohol, smoking, customs: [money] });
    useAppStore.getState().setLastScreen(money.id);
    await renderScreen(<MainScreen />);
    await fireEvent.press(screen.getByText('Был срыв'));
    expect(screen.queryByText('Что это было')).toBeNull();
    // Сумма не введена — записать нельзя.
    expect(screen.getByRole('button', { name: 'Записать' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Сколько денег'), '1500');
    await fireEvent.press(screen.getByRole('button', { name: 'Записать' }));
    expect(repo.insertRelapse).toHaveBeenCalledWith(expect.objectContaining({ habitId: money.id, kind: null, count: 1500 }));
  });

  it('календарь красит день своей привычки её цветом и подписывает итог названием', async () => {
    const r: Relapse = { id: 'k', habitId: coffee.id, date: '2026-09-10', createdAt: '2026-09-10T10:00:00+03:00', kind: 'Латте', count: 1, note: null };
    seed({ alcohol, smoking, customs: [coffee] }, [...relapses, r]);
    mockParams = { filter: coffee.id };
    await renderScreen(<CalendarScreen />);
    // Четыре вкладки — прокручиваемые чипы с эмодзи.
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByText('☕️')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('10 сентября, срыв: Кофе'));
    expect(screen.getByText('Кофе · латте')).toBeTruthy();
    expect(screen.getByLabelText('1 срыв «Кофе» за месяц')).toBeTruthy();
  });

  it('достижения своей привычки', async () => {
    seed({ alcohol, smoking, customs: [{ ...coffee, milestonesEarned: reachedMilestones(27) }] });
    mockParams = { habit: coffee.id };
    await renderScreen(<AchievementsScreen />);
    expect(screen.getByText('Последнее — 21 день без срывов · Кофе')).toBeTruthy();
    expect(screen.getByText('Следующая цель — 30 дней, ещё 3 дня')).toBeTruthy();
  });

  it('при первом запуске можно добавить свою привычку', async () => {
    seedFresh();
    await renderScreen(<OnboardingScreen />);
    await fireEvent.press(screen.getByText('Начать'));
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить свою привычку' }));
    expect(screen.getByText('Новая привычка')).toBeTruthy();

    // Без названия и значка не сохраняется.
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Введите название')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Название'), 'Сладкое');
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить' }));
    expect(screen.getByText('Выберите эмодзи')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Значок'), '🍩🍰');
    await fireEvent.press(screen.getByRole('radio', { name: 'Штуки' }));
    await fireEvent.changeText(screen.getByLabelText('Виды срыва'), 'торт, конфеты, торт');
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить' }));

    expect(screen.getByRole('button', { name: 'Сладкое. Считать дни без срывов: Сладкое' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByText('Сладкое')).toBeTruthy();
    await fireEvent.press(screen.getByText('Готово'));

    expect(repo.completeOnboarding).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'alcohol', enabled: false, quitAt: null }),
      expect.objectContaining({ id: 'smoking', enabled: false, quitAt: null }),
      expect.objectContaining({
        preset: null,
        name: 'Сладкое',
        emoji: '🍩',
        unit: 'pieces',
        kinds: ['торт', 'конфеты'],
        order: 2,
        enabled: true,
        quitAt: '2026-09-28T00:00:00+03:00',
      }),
    ]);
    expect(useAppStore.getState().habits).toHaveLength(3);
  });

  it('в настройках своя привычка добавляется, правится и удаляется', async () => {
    seed({ alcohol, smoking });
    await renderScreen(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Добавить свою привычку' }));
    expect(mockPick).toHaveBeenCalledWith(expect.objectContaining({ mode: 'date' }));
    expect(await screen.findByText('Новая привычка')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Название'), 'Кофе');
    await fireEvent.changeText(screen.getByLabelText('Значок'), '☕️');
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить' }));
    expect(repo.saveHabit).toHaveBeenCalledWith(
      expect.objectContaining({ preset: null, name: 'Кофе', emoji: '☕️', enabled: true, quitAt: '2026-09-28T00:00:00+03:00', order: 2 }),
    );
    const added = useAppStore.getState().habits.find((h) => h.name === 'Кофе')!;
    expect(screen.getByLabelText('Считать: Кофе')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Своя привычка: Изменить' }));
    expect(screen.getByText('Изменить привычку')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Название'), 'Капучино');
    await fireEvent.press(screen.getByRole('button', { name: 'Сохранить' }));
    expect(useAppStore.getState().habits.find((h) => h.id === added.id)?.name).toBe('Капучино');

    const { Alert } = jest.requireActual<typeof import('react-native')>('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Своя привычка: Изменить' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Удалить привычку' }));
    expect(repo.deleteHabit).toHaveBeenCalledWith(added.id);
    expect(useAppStore.getState().habits).toHaveLength(2);
    alert.mockRestore();
  });

  it('больше шести привычек добавить нельзя', async () => {
    const customs = [1, 2, 3, 4].map((i) => ({ ...coffee, id: `c0ffee00-0000-4000-8000-00000000000${i}`, name: `Привычка ${i}`, order: 1 + i }));
    seed({ alcohol, smoking, customs });
    await renderScreen(<SettingsScreen />);
    expect(screen.queryByRole('button', { name: 'Добавить свою привычку' })).toBeNull();
    expect(screen.getByText('Можно вести не больше 6 привычек')).toBeTruthy();
  });
});
