import type { Habit, HabitUnit, Language, PresetId, PresetKind } from '@/domain/types';

import { plural, type PluralForms } from './plural';

const DAY: PluralForms = ['день', 'дня', 'дней'];
const CLEAN_DAY: PluralForms = ['чистый день', 'чистых дня', 'чистых дней'];
const RELAPSE: PluralForms = ['срыв', 'срыва', 'срывов'];
const YEAR: PluralForms = ['год', 'года', 'лет'];
const MONTH: PluralForms = ['месяц', 'месяца', 'месяцев'];

const cleanDays = (n: number) => `${n} ${plural(n, CLEAN_DAY)}`;
const COUNTER_SUFFIX = 'с начала';
const counterSince = (since: string) => `с ${since}`;
const monthTotal = (n: number, habit: Habit) =>
  habit.preset
    ? `${plural(n, RELAPSE)} по ${habit.preset === 'alcohol' ? 'алкоголю' : 'курению'} за месяц`
    : `${plural(n, RELAPSE)} «${habit.name}» за месяц`;
const remain = (n: number) => plural(n, ['остаётся', 'остаются', 'остаются']);

const HABIT_WITHOUT_GENITIVE: Record<PresetId, string> = {
  alcohol: 'без алкоголя',
  smoking: 'без курения',
};
/** «без алкоголя» у встроенных, «без срывов · Кофе» у своих. */
const withoutHabit = (habit: Habit) => (habit.preset ? HABIT_WITHOUT_GENITIVE[habit.preset] : `без срывов · ${habit.name}`);

export const ru = {
  appName: 'Чистый счёт',

  months: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ],
  monthsGenitive: [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ],
  monthsShort: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  weekdays: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'],
  weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],

  habit: {
    alcohol: 'Алкоголь',
    smoking: 'Курение',
  } satisfies Record<PresetId, string>,
  habitWithout: {
    alcohol: 'Без алкоголя',
    smoking: 'Без курения',
  } satisfies Record<PresetId, string>,
  habitWithoutGenitive: HABIT_WITHOUT_GENITIVE,

  units: {
    times: 'Разы',
    pieces: 'Штуки',
    servings: 'Порции',
    minutes: 'Минуты',
    money: 'Деньги',
  } satisfies Record<HabitUnit, string>,

  habits: {
    custom: 'Своя привычка',
    add: 'Добавить свою привычку',
    limit: (n: number) => `Можно вести не больше ${n} привычек`,
    newTitle: 'Новая привычка',
    editTitle: 'Изменить привычку',
    name: 'Название',
    namePlaceholder: 'Например, кофе',
    emoji: 'Значок',
    emojiPlaceholder: '☕️',
    emojiHint: 'Любой эмодзи с клавиатуры',
    color: 'Цвет',
    unit: 'Что считать при срыве',
    kinds: 'Виды срыва',
    kindsPlaceholder: 'Например: кофе, энергетик',
    kindsHint: 'Через запятую, необязательно',
    create: 'Добавить',
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Изменить',
    delete: 'Удалить привычку',
    deleteTitle: 'Удалить привычку?',
    deleteText: 'Удалятся все её срывы и достижения.',
    errorName: 'Введите название',
    errorEmoji: 'Выберите эмодзи',
    cardText: (name: string) => `Считать дни без срывов: ${name}`,
  },

  kind: {
    strong: 'Крепкое',
    light: 'Некрепкое',
    cigarette: 'Сигарета',
    hookah: 'Кальян',
    vape: 'Вейп',
    heated: 'Нагреватель',
    cigar: 'Сигара',
    other: 'Другое',
  } satisfies Record<PresetKind, string>,
  kindHint: {
    strong: 'водка, коньяк, виски',
    light: 'пиво, вино, сидр',
  },

  onboarding: {
    welcomeTitle: 'Чистый счёт',
    welcomeText: 'Считаем дни без алкоголя, курения и любой другой привычки. Срыв не обнуляет ваш прогресс.',
    welcomePoints: [
      'Общий счёт и чистые дни с последнего срыва',
      'Календарь срывов',
      'Всё хранится только на телефоне',
    ],
    start: 'Начать',
    habitsTitle: 'От чего отказываетесь?',
    habitsText: 'Выберите встроенные или добавьте свою. Всё можно поменять позже в настройках.',
    habitCardText: {
      alcohol: 'Считать дни без алкоголя',
      smoking: 'Считать дни без сигарет, вейпа и кальяна',
    } satisfies Record<PresetId, string>,
    next: 'Далее',
    back: 'Назад',
    datesTitle: 'Когда вы отказались?',
    datesText: 'Можно выбрать прошедшую дату — дни с неё сразу засчитаются.',
    quitDate: 'Дата отказа',
    quitTime: 'Время',
    addTime: 'Указать время',
    removeTime: 'Убрать время',
    done: 'Готово',
    step: (current: number, total: number) => `Шаг ${current} из ${total}`,
  },

  main: {
    calendar: 'Календарь срывов',
    settings: 'Настройки',
    achievements: 'Достижения',
    goalOpen: 'открыть достижения',
    /** Подпись рядом с основным счётчиком: «7 дней с начала», ниже «с 1 октября». */
    counterDays: (n: number) => plural(n, DAY),
    counterSuffix: COUNTER_SUFFIX,
    counterSince,
    counterA11y: (days: number, since: string) => `${days} ${plural(days, DAY)} ${COUNTER_SUFFIX}, ${counterSince(since)}`,
    /** «3 года 4 месяца 18 дней»: нулевые части опускаются; меньше месяца — пустая строка, число дней и так на экране. */
    period: ({ years, months, days }: { years: number; months: number; days: number }) =>
      years === 0 && months === 0
        ? ''
        : [
            years > 0 ? `${years} ${plural(years, YEAR)}` : '',
            months > 0 ? `${months} ${plural(months, MONTH)}` : '',
            days > 0 ? `${days} ${plural(days, DAY)}` : '',
          ]
            .filter(Boolean)
            .join(' '),
    goal: (n: number) => `Цель: ${n} ${plural(n, DAY)}`,
    goalRemaining: (n: number) => `ещё ${n}`,
    goalA11y: (goal: number, remaining: number) =>
      `Следующая цель ${goal} ${plural(goal, DAY)}, осталось ${remaining}`,
    cleanLabel: (n: number) => `${plural(n, CLEAN_DAY)} всего`,
    sinceRelapseLabel: (n: number, hadRelapse: boolean) =>
      `${plural(n, CLEAN_DAY)} ${hadRelapse ? 'с последнего срыва' : 'без срывов'}`,
    relapses: 'Срывы',
    noRelapses: 'Срывов нет',
    relapseChip: (kind: string, n: number) => `${kind} · ${n}`,
    relapseButton: 'Был срыв',
  },

  sheet: {
    title: 'Записать срыв',
    phrases: [
      (n: number) =>
        `Отсчёт с последнего срыва начнётся заново, но ${cleanDays(n)} уже ${plural(n, ['ваш', 'ваши', 'ваши'])} и никуда не ${plural(n, ['денется', 'денутся', 'денутся'])}.`,
      (n: number) => `Это один эпизод, а не конец пути. ${cleanDays(n)} ${remain(n)} с вами.`,
      (n: number) => `Вы уже прошли ${cleanDays(n)}. Этого никто не отнимет.`,
      (n: number) => `Срыв — это не провал. ${cleanDays(n)} — ваш результат, и он сохранится.`,
      (n: number) => `Отметим и пойдём дальше: ${cleanDays(n)} ${remain(n)} в вашем счёте.`,
    ],
    phraseNoDays: 'Отсчёт начнётся заново. Главное — что вы продолжаете.',
    alcoholKind: 'Что это было',
    smokingKind: 'Что курили',
    kindTitle: 'Что это было',
    count: 'Сколько раз',
    countLabel: {
      times: 'Сколько раз',
      pieces: 'Сколько штук',
      servings: 'Сколько порций',
      minutes: 'Сколько минут',
      money: 'Сколько денег',
    } satisfies Record<HabitUnit, string>,
    amountPlaceholder: 'Сумма',
    countLess: 'Меньше',
    countMore: 'Больше',
    when: 'Когда',
    today: 'Сегодня',
    yesterday: 'Вчера',
    otherDate: 'Другая дата',
    note: 'Заметка',
    noteOptional: '— необязательно',
    notePlaceholder: 'Что стало поводом?',
    noteCounter: (n: number, max: number) => `${n}/${max}`,
    save: 'Записать',
    cancel: 'Отмена',
    close: 'Закрыть окно',
    saved: 'Срыв записан',
    undo: 'Отменить',
    saveError: 'Не удалось сохранить запись. Попробуйте ещё раз.',
  },

  calendar: {
    title: 'Календарь',
    back: 'Назад',
    all: 'Все',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    legendClean: 'Чистый день',
    cleanDay: 'Чистый день, срывов не было.',
    futureDay: 'Этот день ещё впереди.',
    beforeQuit: 'До даты отказа.',
    selectDay: 'Выберите день',
    selectDayHint: 'Нажмите на дату, чтобы посмотреть подробности.',
    addRelapse: 'Добавить срыв',
    chooseHabit: 'Какой срыв записать?',
    relapseLabel: (habit: string, kind: string, count: number) =>
      `${habit}${kind ? ` · ${kind.toLowerCase()}` : ''}${count > 1 ? ` ×${count}` : ''}`,
    deleteHint: 'Удерживайте, чтобы удалить',
    deleteTitle: 'Удалить запись?',
    deleteText: 'Показатели будут пересчитаны.',
    delete: 'Удалить запись',
    cancel: 'Отмена',
    monthTotal,
    monthTotalA11y: (n: number, habit: Habit) => `${n} ${monthTotal(n, habit)}`,
    dayA11y: (label: string, state: string) => `${label}${state ? `, ${state}` : ''}`,
    stateA11y: {
      clean: 'чистый день',
      inactive: 'недоступно',
      today: 'сегодня',
    },
    /** «срыв: Алкоголь, Кофе» — привычки, у которых в этот день был срыв. */
    relapseA11y: (names: string) => `срыв: ${names}`,
  },

  achievements: {
    title: 'Достижения',
    count: (n: number) => `${n} ${plural(n, ['достижение', 'достижения', 'достижений'])}`,
    none: 'Пока нет достижений',
    inStreak: (n: number) => `В текущей серии — ${n} ${plural(n, ['веха', 'вехи', 'вех'])}`,
    last: (n: number, habit: Habit) => `Последнее — ${n} ${plural(n, DAY)} ${withoutHabit(habit)}`,
    next: (goal: number, remaining: number) =>
      `Следующая цель — ${goal} ${plural(goal, DAY)}, ещё ${remaining} ${plural(remaining, DAY)}`,
    tiers: 'Главные рубежи',
    all: 'Все вехи',
    /** Название рубежа: месяц, три месяца, полгода, год, далее по годам. */
    tierName: (days: number) => {
      if (days === 30) return 'Месяц';
      if (days === 90) return 'Три месяца';
      if (days === 180) return 'Полгода';
      const years = Math.round(days / 365);
      return years === 1 ? 'Год' : `${years} ${plural(years, YEAR)}`;
    },
    days: (n: number) => `${n} ${plural(n, DAY)}`,
    reached: 'достигнуто',
    earlier: 'получено раньше',
    remaining: (n: number) => `ещё ${n} ${plural(n, DAY)}`,
    badgeA11y: (n: number, state: 'current' | 'goal') =>
      `${n} ${plural(n, DAY)}: ${state === 'current' ? 'достигнуто в текущей серии' : 'текущая цель'}`,
    legendCurrent: 'текущая серия',
    legendGoal: 'цель',
    /** Свёрнутые вехи прошлых серий: «Ещё 235 вех получено в прошлых сериях». */
    earlierCount: (n: number) =>
      `Ещё ${n} ${plural(n, ['веха', 'вехи', 'вех'])} ${plural(n, ['получена', 'получены', 'получено'])} в прошлых сериях`,
    hint: 'Вехи считаются по чистым дням с последнего срыва: 5, 10, 14, 21, 30, 45, 60, 90, 120, 180 и 270 дней, год, полтора, два года и дальше каждый год. Достижение остаётся с вами навсегда, даже если потом был срыв, а в новой серии те же вехи можно пройти и отпраздновать снова.',
    back: 'Назад',
  },

  milestone: {
    title: 'Новая веха!',
    /** Веха считается по чистым дням с последнего срыва, поэтому «без» здесь правда. */
    days: (n: number, habit: Habit) => `${plural(n, DAY)} ${withoutHabit(habit)}`,
    /** Ярусы по числу дней: текст меняется по рубежам месяца, трёх месяцев, полугода и года. */
    text: (n: number): string =>
      n >= 365
        ? 'Целый год и больше. Это огромная работа — гордитесь собой.'
        : n >= 180
          ? 'Полгода и больше. Это уже образ жизни.'
          : n >= 90
            ? 'Три месяца и больше. Вы умеете держать слово, данное себе.'
            : n >= 30
              ? 'Месяц и больше. Это уже устойчивая привычка. Так держать!'
              : 'Каждый день — это шаг. Продолжайте в том же темпе.',
    hint: 'Нажмите, чтобы продолжить',
  },

  settings: {
    title: 'Настройки',
    back: 'Назад',
    habits: 'Привычки',
    enabled: 'Считать',
    quitDate: 'Дата отказа',
    notSet: 'не указана',
    lastHabitTitle: 'Нельзя отключить',
    lastHabitText: 'Должна быть включена хотя бы одна привычка.',
    changeDateTitle: 'Изменить дату отказа?',
    changeDateText: 'Все показатели будут пересчитаны. Срывы раньше новой даты перестанут учитываться.',
    change: 'Изменить',
    cancel: 'Отмена',
    language: 'Язык',
    /** Названия языков на самих языках, одинаковы в обоих словарях. */
    languages: { ru: 'Русский', en: 'English' } satisfies Record<Language, string>,
    privacy: 'Данные',
    privacyText: 'Все данные хранятся только на этом устройстве и никуда не отправляются.',
    excludeBackup: 'Не включать в облачный бэкап',
    excludeBackupText: 'По умолчанию данные попадают в резервную копию iCloud, чтобы не потеряться при смене телефона.',
    excludeBackupUnavailable: 'Недоступно в этой сборке (Expo Go).',
    reset: 'Сбросить все данные',
    resetTitle: 'Сбросить все данные?',
    resetText: 'Удалятся даты отказа и все записи о срывах.',
    resetConfirmTitle: 'Точно удалить?',
    resetConfirmText: 'Это действие нельзя отменить.',
    resetConfirm: 'Удалить всё',
    continue: 'Продолжить',
    version: (v: string) => `Версия ${v}`,
  },

  errors: {
    title: 'Что-то пошло не так',
    dbOpen: 'Не удалось открыть данные приложения. Перезапустите приложение.',
  },

  pickerDone: 'Готово',
};

export type Strings = typeof ru;
