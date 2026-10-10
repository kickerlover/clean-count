import { localDateAt, toZoned } from '../localDate';
import { computeHabitStats, daysSinceLastRelapse } from '../stats';
import { emptyHabit, type Habit, type PresetId, type Relapse } from '../types';

const MSK = 'Europe/Moscow';
/** Календарная дата момента в поясе — то, что экраны получают из часов. */
const at = (iso: string, tz = MSK) => localDateAt(new Date(iso), tz);

const habit = (quitAt: string, id: PresetId = 'alcohol'): Habit => ({ ...emptyHabit(id), enabled: true, quitAt });

let seq = 0;
const relapse = (date: string, createdAt: string, kind: string | null = 'light', habitId: Habit['id'] = 'alcohol'): Relapse => ({
  id: `r${++seq}`,
  habitId,
  date,
  createdAt,
  kind,
  count: 1,
  note: null,
});

describe('пример из ТЗ', () => {
  const h = habit('2026-03-03T00:00:00+03:00');
  const relapses = [
    relapse('2026-04-10', '2026-04-10T22:00:00+03:00', 'strong'),
    relapse('2026-06-05', '2026-06-06T09:00:00+03:00', 'light'),
    relapse('2026-08-16', '2026-08-18T10:00:00+03:00', 'light'),
  ];
  const stats = computeHabitStats(h, relapses, at('2026-09-28T05:17:00+03:00'));

  it('общий счёт — 209 дней с 3 марта', () => {
    expect(stats.totalDays).toBe(209);
  });

  it('чистых дней: 209 − 3 = 206', () => {
    expect(stats.cleanDays).toBe(206);
  });

  it('срывы с разбивкой по типам', () => {
    expect(stats.relapseCount).toBe(3);
    expect(stats.relapsesByKind).toEqual({ strong: 1, light: 2 });
  });

  it('чистых дней с последнего срыва: после 16 августа — 42, серия с 17 августа', () => {
    expect(stats.daysSinceRelapse).toBe(42);
    expect(stats.streakStart).toBe('2026-08-17');
  });

  it('следующая цель по чистым дням с последнего срыва — 45, осталось 3', () => {
    expect(stats.goal).toBe(45);
    expect(stats.goalRemaining).toBe(3);
    expect(stats.goalProgress).toBeCloseTo(42 / 45);
  });

  it('после срыва цель начинается заново с 5 дней', () => {
    const fresh = computeHabitStats(h, [...relapses, { ...relapses[0]!, id: 'today', date: '2026-09-28' }], at('2026-09-28T05:17:00+03:00'));
    expect(fresh).toMatchObject({ daysSinceRelapse: 0, goal: 5, goalRemaining: 5, goalProgress: 0 });
  });
});

describe('чистые дни с последнего срыва', () => {
  const h = habit('2026-09-01T00:00:00+03:00');

  it('без срывов равны общему счёту и не зависят от времени отказа', () => {
    const withTime = habit('2026-09-01T18:30:00+03:00');
    const stats = computeHabitStats(withTime, [], at('2026-09-03T09:00:00+03:00'));
    expect(stats).toMatchObject({ totalDays: 2, cleanDays: 2, daysSinceRelapse: 2 });
  });

  it('срыв сегодня или вчера даёт 0, позавчера — 1', () => {
    const today = at('2026-09-10T18:00:00+03:00');
    expect(daysSinceLastRelapse(h, [relapse('2026-09-10', '2026-09-10T14:30:00+03:00')], today)).toBe(0);
    expect(daysSinceLastRelapse(h, [relapse('2026-09-09', '2026-09-10T12:00:00+03:00')], today)).toBe(0);
    expect(daysSinceLastRelapse(h, [relapse('2026-09-08', '2026-09-08T23:59:00+03:00')], today)).toBe(1);
  });

  it('момент и порядок записи срывов не важны', () => {
    const today = at('2026-09-20T12:00:00+03:00');
    const sameDay = relapse('2026-09-10', '2026-09-10T10:00:00+03:00');
    const backdated = relapse('2026-09-09', '2026-09-10T12:00:00+03:00');
    expect(daysSinceLastRelapse(h, [sameDay, backdated], today)).toBe(9);
    expect(daysSinceLastRelapse(h, [backdated, sameDay], today)).toBe(9);
  });

  it('дата отказа в будущем даёт нули, а не отрицательные значения', () => {
    const later = habit('2026-09-12T00:00:00+03:00');
    const stats = computeHabitStats(later, [], at('2026-09-10T12:00:00+03:00'));
    expect(stats).toMatchObject({ totalDays: 0, cleanDays: 0, daysSinceRelapse: 0 });
  });
});

describe('несколько срывов', () => {
  const h = habit('2026-09-01T00:00:00+03:00');

  it('два срыва в один день — один «грязный» день, но два в счётчике', () => {
    const relapses = [
      relapse('2026-09-05', '2026-09-05T12:00:00+03:00', 'strong'),
      relapse('2026-09-05', '2026-09-05T20:00:00+03:00', 'light'),
    ];
    const stats = computeHabitStats(h, relapses, at('2026-09-10T12:00:00+03:00'));
    expect(stats).toMatchObject({ totalDays: 9, cleanDays: 8, relapseCount: 2, daysSinceRelapse: 4 });
  });

  it('срыв сегодня не уменьшает чистые дни до конца дня, завтра — уменьшает', () => {
    const r = relapse('2026-09-10', '2026-09-10T10:00:00+03:00');
    const today = computeHabitStats(h, [r], at('2026-09-10T12:00:00+03:00'));
    expect(today).toMatchObject({ totalDays: 9, cleanDays: 9, daysSinceRelapse: 0 });
    const tomorrow = computeHabitStats(h, [r], at('2026-09-11T12:00:00+03:00'));
    expect(tomorrow).toMatchObject({ totalDays: 10, cleanDays: 9, daysSinceRelapse: 0 });
    const dayAfter = computeHabitStats(h, [r], at('2026-09-12T12:00:00+03:00'));
    expect(dayAfter).toMatchObject({ totalDays: 11, cleanDays: 10, daysSinceRelapse: 1 });
  });

  it('удаление срыва возвращает прежние показатели', () => {
    const today = at('2026-09-10T12:00:00+03:00');
    const before = computeHabitStats(h, [], today);
    const r = relapse('2026-09-05', '2026-09-06T09:00:00+03:00');
    const withRelapse = computeHabitStats(h, [r], today);
    expect(withRelapse.cleanDays).toBe(before.cleanDays - 1);
    expect(withRelapse.daysSinceRelapse).toBeLessThan(before.daysSinceRelapse);
    expect(computeHabitStats(h, [r].filter((x) => x.id !== r.id), today)).toEqual(before);
  });

  it('срывы другой привычки не влияют', () => {
    const r = relapse('2026-09-05', '2026-09-05T12:00:00+03:00', 'cigarette', 'smoking');
    const stats = computeHabitStats(h, [r], at('2026-09-10T12:00:00+03:00'));
    expect(stats).toMatchObject({ relapseCount: 0, cleanDays: 9, daysSinceRelapse: 9 });
  });
});

describe('изменение даты отказа', () => {
  const relapses = [
    relapse('2026-08-20', '2026-08-20T12:00:00+03:00'),
    relapse('2026-09-05', '2026-09-05T12:00:00+03:00'),
  ];
  const today = at('2026-09-10T12:00:00+03:00');

  it('срывы раньше новой даты не учитываются', () => {
    const stats = computeHabitStats(habit('2026-09-01T00:00:00+03:00'), relapses, today);
    expect(stats.relapseCount).toBe(1);
    expect(stats.cleanDays).toBe(8);
  });

  it('перенос даты на более раннюю снова учитывает старые срывы', () => {
    const stats = computeHabitStats(habit('2026-08-01T00:00:00+03:00'), relapses, today);
    expect(stats).toMatchObject({ relapseCount: 2, totalDays: 40, cleanDays: 38, daysSinceRelapse: 4 });
  });
});

describe('время и часовые пояса', () => {
  it('смена даты в полночь увеличивает счётчики', () => {
    const h = habit('2026-09-01T00:00:00+03:00');
    const before = computeHabitStats(h, [], at('2026-09-10T23:59:00+03:00'));
    const after = computeHabitStats(h, [], at('2026-09-11T00:00:00+03:00'));
    expect(before).toMatchObject({ totalDays: 9, daysSinceRelapse: 9 });
    expect(after).toMatchObject({ totalDays: 10, daysSinceRelapse: 10 });
  });

  it('перевод часов на летнее и зимнее время не влияет на календарный счёт', () => {
    const BERLIN = 'Europe/Berlin';
    // В ночь на 29 марта 2026 часы в Берлине переводятся с 02:00 на 03:00, 25 октября — обратно.
    const spring = computeHabitStats(habit('2026-03-28T00:00:00+01:00'), [], at('2026-03-30T00:00:00+02:00', BERLIN));
    const autumn = computeHabitStats(habit('2026-10-24T00:00:00+02:00'), [], at('2026-10-26T00:30:00+01:00', BERLIN));
    expect(spring.totalDays).toBe(2);
    expect(autumn.totalDays).toBe(2);
  });

  it('смена часового пояса не меняет записанные дни срывов', () => {
    const h = habit('2026-09-01T00:00:00+03:00');
    // Записан в Москве в 23:30 — в Лондоне это ещё 21:30 того же дня, в Токио уже следующий день.
    const r = relapse('2026-09-10', toZoned(new Date('2026-09-10T23:30:00+03:00'), MSK));
    const now = new Date('2026-09-15T12:00:00+03:00');
    for (const tz of [MSK, 'Europe/London', 'Asia/Tokyo', 'America/New_York']) {
      const stats = computeHabitStats(h, [r], localDateAt(now, tz));
      expect(stats.relapseCount).toBe(1);
      expect(stats.daysSinceRelapse).toBe(4);
    }
  });

  it('«сегодня» определяется в текущем поясе', () => {
    const instant = new Date('2026-09-10T22:30:00Z');
    expect(localDateAt(instant, 'Europe/London')).toBe('2026-09-10');
    expect(localDateAt(instant, MSK)).toBe('2026-09-11');
  });
});
