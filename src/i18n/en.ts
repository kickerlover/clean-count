import type { Habit, PresetId } from '@/domain/types';

import type { Strings } from './ru';

/** Английские формы: 1 day, 2 days. */
const p = (n: number, one: string, other: string) => (Math.abs(n) === 1 ? one : other);
const days = (n: number) => `${n} ${p(n, 'day', 'days')}`;
const cleanDays = (n: number) => `${n} clean ${p(n, 'day', 'days')}`;
const COUNTER_SUFFIX = 'since start';
const counterSince = (since: string) => `since ${since}`;
const monthTotal = (n: number, habit: Habit) =>
  `${habit.preset ? (habit.preset === 'alcohol' ? 'alcohol' : 'smoking') : habit.name} ${p(n, 'relapse', 'relapses')} this month`;

const HABIT_WITHOUT: Record<PresetId, string> = {
  alcohol: 'without alcohol',
  smoking: 'without smoking',
};
const withoutHabit = (habit: Habit) => (habit.preset ? HABIT_WITHOUT[habit.preset] : `relapse-free · ${habit.name}`);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const en: Strings = {
  appName: 'Clean Count',

  months: MONTHS,
  monthsGenitive: MONTHS,
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  weekdaysShort: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],

  habit: {
    alcohol: 'Alcohol',
    smoking: 'Smoking',
  },
  habitWithout: {
    alcohol: 'Alcohol-free',
    smoking: 'Smoke-free',
  },
  habitWithoutGenitive: HABIT_WITHOUT,

  units: {
    times: 'Times',
    pieces: 'Pieces',
    servings: 'Servings',
    minutes: 'Minutes',
    money: 'Money',
  },

  habits: {
    custom: 'Custom habit',
    add: 'Add a custom habit',
    limit: (n: number) => `You can track up to ${n} habits`,
    newTitle: 'New habit',
    editTitle: 'Edit habit',
    name: 'Name',
    namePlaceholder: 'For example, coffee',
    emoji: 'Icon',
    emojiPlaceholder: '☕️',
    emojiHint: 'Any emoji from the keyboard',
    color: 'Colour',
    unit: 'What to count on a relapse',
    kinds: 'Relapse types',
    kindsPlaceholder: 'For example: coffee, energy drink',
    kindsHint: 'Comma-separated, optional',
    create: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete habit',
    deleteTitle: 'Delete this habit?',
    deleteText: 'All its relapses and achievements will be deleted.',
    errorName: 'Enter a name',
    errorEmoji: 'Pick an emoji',
    cardText: (name: string) => `Count relapse-free days: ${name}`,
  },

  kind: {
    strong: 'Spirits',
    light: 'Light drinks',
    cigarette: 'Cigarette',
    hookah: 'Hookah',
    vape: 'Vape',
    heated: 'Heated tobacco',
    cigar: 'Cigar',
    other: 'Other',
  },
  kindHint: {
    strong: 'vodka, cognac, whisky',
    light: 'beer, wine, cider',
  },

  onboarding: {
    welcomeTitle: 'Clean Count',
    welcomeText: 'Count your days without alcohol, smoking or any other habit. A relapse does not erase your progress.',
    welcomePoints: [
      'Total count and clean days since the last relapse',
      'Relapse calendar',
      'Everything stays on your phone',
    ],
    start: 'Start',
    habitsTitle: 'What are you quitting?',
    habitsText: 'Pick the built-in ones or add your own. You can change this later in settings.',
    habitCardText: {
      alcohol: 'Count days without alcohol',
      smoking: 'Count days without cigarettes, vapes and hookah',
    },
    next: 'Next',
    back: 'Back',
    datesTitle: 'When did you quit?',
    datesText: 'You can pick a past date — the days since then count right away.',
    quitDate: 'Quit date',
    quitTime: 'Time',
    addTime: 'Add time',
    removeTime: 'Remove time',
    done: 'Done',
    step: (current: number, total: number) => `Step ${current} of ${total}`,
  },

  main: {
    calendar: 'Relapse calendar',
    settings: 'Settings',
    achievements: 'Achievements',
    goalOpen: 'open achievements',
    counterDays: (n: number) => p(n, 'day', 'days'),
    counterSuffix: COUNTER_SUFFIX,
    counterSince,
    counterA11y: (n: number, since: string) => `${days(n)} ${COUNTER_SUFFIX}, ${counterSince(since)}`,
    period: ({ years, months, days: d }: { years: number; months: number; days: number }) =>
      years === 0 && months === 0
        ? ''
        : [
            years > 0 ? `${years} ${p(years, 'year', 'years')}` : '',
            months > 0 ? `${months} ${p(months, 'month', 'months')}` : '',
            d > 0 ? days(d) : '',
          ]
            .filter(Boolean)
            .join(' '),
    goal: (n: number) => `Goal: ${days(n)}`,
    goalRemaining: (n: number) => `${n} to go`,
    goalA11y: (goal: number, remaining: number) => `Next goal ${days(goal)}, ${remaining} to go`,
    cleanLabel: (n: number) => `clean ${p(n, 'day', 'days')} in total`,
    sinceRelapseLabel: (n: number, hadRelapse: boolean) =>
      `clean ${p(n, 'day', 'days')} ${hadRelapse ? 'since the last relapse' : 'with no relapses'}`,
    relapses: 'Relapses',
    noRelapses: 'No relapses',
    relapseChip: (kind: string, n: number) => `${kind} · ${n}`,
    relapseButton: 'I relapsed',
  },

  sheet: {
    title: 'Log a relapse',
    phrases: [
      (n: number) =>
        `The count since the last relapse starts over, but ${cleanDays(n)} ${p(n, 'is', 'are')} yours and ${p(n, "isn't", "aren't")} going anywhere.`,
      (n: number) => `It is one episode, not the end of the road. ${cleanDays(n)} ${p(n, 'stays', 'stay')} with you.`,
      (n: number) => `You have already made it through ${cleanDays(n)}. Nobody can take that away.`,
      (n: number) => `A relapse is not a failure. ${cleanDays(n)} ${p(n, 'is', 'are')} your result, and it stays.`,
      (n: number) => `Let's note it and move on: ${cleanDays(n)} ${p(n, 'remains', 'remain')} in your count.`,
    ],
    phraseNoDays: 'The count starts over. What matters is that you keep going.',
    alcoholKind: 'What was it',
    smokingKind: 'What did you smoke',
    kindTitle: 'What was it',
    count: 'How many times',
    countLabel: {
      times: 'How many times',
      pieces: 'How many pieces',
      servings: 'How many servings',
      minutes: 'How many minutes',
      money: 'How much money',
    },
    amountPlaceholder: 'Amount',
    countLess: 'Fewer',
    countMore: 'More',
    when: 'When',
    today: 'Today',
    yesterday: 'Yesterday',
    otherDate: 'Another date',
    note: 'Note',
    noteOptional: '— optional',
    notePlaceholder: 'What triggered it?',
    noteCounter: (n: number, max: number) => `${n}/${max}`,
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    saved: 'Relapse logged',
    undo: 'Undo',
    saveError: 'Could not save the entry. Please try again.',
  },

  calendar: {
    title: 'Calendar',
    back: 'Back',
    all: 'All',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    legendClean: 'Clean day',
    cleanDay: 'Clean day, no relapses.',
    futureDay: 'This day is still ahead.',
    beforeQuit: 'Before the quit date.',
    selectDay: 'Select a day',
    selectDayHint: 'Tap a date to see the details.',
    addRelapse: 'Add relapse',
    chooseHabit: 'Which relapse to log?',
    relapseLabel: (habit: string, kind: string, count: number) =>
      `${habit}${kind ? ` · ${kind.toLowerCase()}` : ''}${count > 1 ? ` ×${count}` : ''}`,
    deleteHint: 'Hold to delete',
    deleteTitle: 'Delete this entry?',
    deleteText: 'The numbers will be recalculated.',
    delete: 'Delete entry',
    cancel: 'Cancel',
    monthTotal,
    monthTotalA11y: (n: number, habit: Habit) => `${n} ${monthTotal(n, habit)}`,
    dayA11y: (label: string, state: string) => `${label}${state ? `, ${state}` : ''}`,
    stateA11y: {
      clean: 'clean day',
      inactive: 'unavailable',
      today: 'today',
    },
    relapseA11y: (names: string) => `relapse: ${names}`,
  },

  achievements: {
    title: 'Achievements',
    count: (n: number) => `${n} ${p(n, 'achievement', 'achievements')}`,
    none: 'No achievements yet',
    inStreak: (n: number) => `Current streak — ${n} ${p(n, 'milestone', 'milestones')}`,
    last: (n: number, habit: Habit) => `Latest — ${days(n)} ${withoutHabit(habit)}`,
    next: (goal: number, remaining: number) => `Next goal — ${days(goal)}, ${days(remaining)} to go`,
    tiers: 'Key milestones',
    all: 'All milestones',
    tierName: (d: number) => {
      if (d === 30) return 'One month';
      if (d === 90) return 'Three months';
      if (d === 180) return 'Half a year';
      const years = Math.round(d / 365);
      return years === 1 ? 'One year' : `${years} years`;
    },
    days,
    reached: 'reached',
    earlier: 'earned earlier',
    remaining: (n: number) => `${days(n)} to go`,
    badgeA11y: (n: number, state: 'current' | 'goal') =>
      `${days(n)}: ${state === 'current' ? 'reached in the current streak' : 'current goal'}`,
    legendCurrent: 'current streak',
    legendGoal: 'goal',
    earlierCount: (n: number) => `${n} more ${p(n, 'milestone', 'milestones')} earned in previous streaks`,
    hint: 'Milestones follow your clean days since the last relapse: 5, 10, 14, 21, 30, 45, 60, 90, 120, 180 and 270 days, one year, a year and a half, two years, then every year. An achievement stays with you forever, even after a relapse, and in a new streak you can earn and celebrate the same milestones again.',
    back: 'Back',
  },

  milestone: {
    title: 'New milestone!',
    days: (n: number, habit: Habit) => `${p(n, 'day', 'days')} ${withoutHabit(habit)}`,
    text: (n: number) =>
      n >= 365
        ? 'A whole year and more. That is enormous work — be proud of yourself.'
        : n >= 180
          ? 'Half a year and more. This is a way of life now.'
          : n >= 90
            ? 'Three months and more. You know how to keep a promise to yourself.'
            : n >= 30
              ? 'A month and more. This is a solid habit now. Keep it up!'
              : 'Every day is a step. Keep the pace.',
    hint: 'Tap to continue',
  },

  settings: {
    title: 'Settings',
    back: 'Back',
    habits: 'Habits',
    enabled: 'Track',
    quitDate: 'Quit date',
    notSet: 'not set',
    lastHabitTitle: 'Cannot turn off',
    lastHabitText: 'At least one habit must stay on.',
    changeDateTitle: 'Change the quit date?',
    changeDateText: 'All numbers will be recalculated. Relapses before the new date will no longer count.',
    change: 'Change',
    cancel: 'Cancel',
    language: 'Language',
    languages: { ru: 'Русский', en: 'English' },
    privacy: 'Data',
    privacyText: 'All data is stored only on this device and never leaves it.',
    excludeBackup: 'Exclude from cloud backup',
    excludeBackupText: 'By default the data is included in the iCloud backup so it survives switching phones.',
    excludeBackupUnavailable: 'Not available in this build (Expo Go).',
    reset: 'Reset all data',
    resetTitle: 'Reset all data?',
    resetText: 'Quit dates and all relapse entries will be deleted.',
    resetConfirmTitle: 'Delete for sure?',
    resetConfirmText: 'This cannot be undone.',
    resetConfirm: 'Delete everything',
    continue: 'Continue',
    version: (v: string) => `Version ${v}`,
  },

  errors: {
    title: 'Something went wrong',
    dbOpen: 'Could not open the app data. Please restart the app.',
  },

  pickerDone: 'Done',
};
