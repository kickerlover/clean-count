import { emptyHabit } from '@/domain/types';

import { en } from '../en';
import { getLanguage, setLanguage, systemLanguage, t } from '../index';
import { ru } from '../ru';

/** Пути всех листьев словаря: ключи и типы значений должны совпадать у всех языков. */
function shape(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}:array(${value.length})`];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}:${typeof value}`];
}

afterEach(() => setLanguage('ru'));

describe('языки интерфейса', () => {
  it('английский словарь повторяет структуру русского', () => {
    expect(shape(en).sort()).toEqual(shape(ru).sort());
  });

  it('по умолчанию язык устройства: русский в тестовом окружении', () => {
    expect(systemLanguage()).toBe('ru');
    expect(getLanguage()).toBe('ru');
    expect(t.settings.title).toBe('Настройки');
  });

  it('переключение словаря меняет строки без переимпорта', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t.settings.title).toBe('Settings');
    expect(t.main.goal(5)).toBe('Goal: 5 days');
    expect(t.main.goal(1)).toBe('Goal: 1 day');
    expect(t.main.period({ years: 1, months: 0, days: 1 })).toBe('1 year 1 day');
    expect(t.main.sinceRelapseLabel(1, false)).toBe('clean day with no relapses');
    expect(t.achievements.tierName(730)).toBe('2 years');
    expect(t.calendar.monthTotalA11y(1, emptyHabit('alcohol'))).toBe('1 alcohol relapse this month');
    expect(t.sheet.phrases[0]!(1)).toBe(
      "The count since the last relapse starts over, but 1 clean day is yours and isn't going anywhere.",
    );
    setLanguage('ru');
    expect(t.settings.title).toBe('Настройки');
  });

  it('названия языков одинаковы в обоих словарях', () => {
    expect(en.settings.languages).toEqual(ru.settings.languages);
  });
});
