This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Проект «Чистый счёт» — передача агенту

Этот раздел — брифинг для ИИ-агента, который продолжает работу над проектом. Человеку-разработчику достаточно `README.md`.

### Контекст

- ТЗ: `ТЗ приложение «Чистый счёт».pdf` в корне репозитория. Это источник истины по требованиям. Реализован MVP (разделы 2–9 ТЗ).
- Макеты «Энергия»: https://claude.ai/artifact/3z2zuzgL49RkMWnFAD7RKR. Утверждены экраны `Energy.dc.html` (алкоголь), `Smoking.dc.html`, `RelapseAlco.dc.html`, `RelapseSmoke.dc.html`, `Calendar.dc.html`; все 390×844. Экраны `Main.dc.html` и `Night.dc.html` — отклонённые варианты, их игнорируй. Экран настроек в макетах не нарисован и сделан в том же стиле.
- Архитектура, правила подсчёта и принятые решения по неоднозначностям ТЗ — в `README.md`, разделы «Как устроен подсчёт» и «Решения по неоднозначным местам ТЗ». Прочитай их до изменений в логике.
- Свои привычки добавлены 10 октября 2026 (README, решение 14): конструктор с эмодзи, лимит шесть привычек, миграция 3. Версия 1.1.0.
- Главный экран и вехи изменены по решению владельца 8 октября 2026 (README, решение 11): основной счётчик — общий счёт с датой в годах, месяцах и днях; серия заменена на «чистые дни с последнего срыва» по календарю; цель и вехи по лестнице 5, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 545, 730 и далее каждый год по этим дням, после срыва заново с 5. В этой части раздел 4 ТЗ не источник истины, не «чини» обратно.

### Текущее состояние

Код писался на машине без Xcode и Android SDK.

**Проверено:**
- 107 тестов Jest проходят (`npm test`): домен, часовые пояса, свои привычки, smoke-тесты экранов.
- `npm run typecheck` и `npm run lint` без ошибок, `npx expo-doctor` — 21/21.
- `npx expo export` собирает JS-бандлы iOS и Android.
- `npx expo prebuild --no-install` генерирует нативные проекты, автолинковка находит `modules/backup-exclusion`.

**Не проверено ни разу:**
- компиляция Swift/Kotlin;
- запуск на симуляторе или устройстве;
- внешний вид относительно макетов.

### Первые задачи (по порядку)

1. `npm install`, затем `npx expo run:ios` и `npx expo run:android`. Если не компилируется локальный модуль `modules/backup-exclusion` (`ios/BackupExclusionModule.swift`, `android/.../BackupExclusionModule.kt`), сверь синтаксис Expo Modules API с модулями из `node_modules/expo-*` той же версии SDK.
2. Пройди на устройстве чек-лист «Ручная приёмка» из `README.md` (раздел 10 ТЗ).
3. Сверь экраны с макетами: размеры, отступы, радиусы, шрифты. Проверь ширину 360 и 430 pt и крупный системный шрифт.
4. Сообщи человеку, что проверено и что исправлено. Не утверждай, что работает то, что не запускалось.

### Места, которые стоит проверить на устройстве в первую очередь

- `src/components/BottomSheet.tsx` — самописное нижнее окно (Modal + Reanimated + Gesture Handler). Проверь:
  - свайп вниз (жест висит только на зоне «ручки» сверху окна);
  - клавиатуру при вводе заметки: на iOS используется `KeyboardAvoidingView`, на Android — `adjustResize`;
  - пропуски кадров при анимации.
- `src/components/DatePicker.tsx`:
  - на iOS выбор даты показывается нижним Modal через `PickerHost`;
  - внутри окна срыва на iOS вместо него встроенный `display="inline"`, чтобы не открывать Modal поверх Modal;
  - на Android используется `DateTimePickerAndroid.open`, проверь, что диалог открывается поверх окна срыва.
- `src/app/calendar.tsx` — горизонтальный `FlatList` с постраничной прокруткой месяцев. Проверь, что свайп и стрелки синхронны с заголовком месяца и что `initialScrollIndex` открывает текущий месяц.
- `src/app/main.tsx` — `PagerView` и `SegmentedControl`. Проверь, что индикатор переключателя едет вместе с пальцем и что приложение открывается на последнем просмотренном экране.
- `src/domain/tz.ts`: убедись на устройстве, что при смене часового пояса в настройках телефона счётчики пересчитываются без перезапуска приложения.
- Исключение из бэкапа. iOS ставит флаг на папку `Documents/SQLite`. Android переносит базу между `files/SQLite` и `no_backup/SQLite`, после переключения база переоткрывается.

### Правила работы с кодом

- Доменная логика (`src/domain`) — чистые функции без React, время и пояс передаются явно (`now`, `tz`). Любое изменение правил подсчёта сопровождай тестами в `src/domain/__tests__`.
- Не подключай библиотеки часовых поясов, которые опираются на `Intl.DateTimeFormat` с `timeZoneName: 'longOffset'` (`date-fns-tz`, `@date-fns/tz` и подобные): в Hermes это даёт `NaN`. Используй `src/domain/tz.ts`.
- Все строки интерфейса хранятся только в `src/i18n/ru.ts` и `src/i18n/en.ts` (одинаковая структура, есть тест). `t` — прокси на активный словарь; в каждом экране вызывай `useLanguage()`, чтобы он перерисовался при смене языка. Склонения в русском — через `plural()`, даты — через `src/i18n/format.ts`.
- Все размеры в коде заданы для iPhone 14 Pro Max (430 pt) и масштабируются под ширину экрана (`src/theme/scale.ts`). Стили создавай только через `createStyles()` из `@/theme` (не `StyleSheet.create`): он умножает размеры, отступы, радиусы и шрифты на `SCALE`. Число вне стилей (inline-стиль, вычисление ширины, отступ от безопасной зоны) оборачивай в `s()`. Токены `radii`, `spacing`, `HIT` тоже эталонные: внутри `createStyles` их не трогай, вне стилей — `s(HIT)`.
- Цвета, шрифты и радиусы берутся из `src/theme`, хардкод цветов в компонентах не допускается. Цвет привычки — всегда `habit.color` (у встроенных он равен `PRESET_COLORS`, у своих выбран пользователем); таблиц цветов по `id` больше нет.
- Привычки в store — массив `Habit[]` в порядке `order`, встроенные (`preset` = `alcohol`/`smoking`) есть всегда, даже выключенные; свои имеют `preset: null` и UUID. Не предполагай, что `habitId` — это `'alcohol' | 'smoking'`. Названия и подписи бери через `habitName`/`habitLabel`/`kindLabel` из `src/i18n/habits.ts`, виды срыва — через `habitKinds()` из `src/domain/habits.ts`. Лимит привычек — `MAX_HABITS` (6).
- Shared values Reanimated читай и пиши через `.get()` / `.set()`: этого требуют правила React Compiler в ESLint. Не вызывай `setState` синхронно в `useEffect`. Внутри ворклетов (`useAnimatedStyle`, `'worklet'`) нельзя вызывать `s()` и другие функции из модулей приложения: ворклет выполняется в UI-потоке, где их нет, и приложение падает при запуске. Считай число снаружи и передавай в ворклет как значение.
- Данные пишутся в SQLite сразу, а store обновляется после записи (`src/store/appStore.ts`). Схему меняй только новой миграцией в конце массива `MIGRATIONS` (`src/db/migrations.ts`), старые миграции не трогай. Таблица `relapses` ссылается на `habits` с `ON DELETE CASCADE`, поэтому привычки сохраняй только UPSERT-ом (`ON CONFLICT(id) DO UPDATE`), никогда `INSERT OR REPLACE`: REPLACE удаляет строку и каскадом стирает все срывы привычки.
- Тесты экранов лежат в `src/__tests__`, а не в `src/app`: всё внутри `src/app` expo-router считает маршрутами. RNTL v14 асинхронный: `await render(...)`, `await fireEvent...`.
- Не добавляй сетевые запросы, аналитику и `expo-updates`: по ТЗ приложение офлайн и приватное.
- Перед тем как считать задачу выполненной, прогони `npm test && npm run typecheck && npm run lint`.

### Бэклог (версия 2 из ТЗ, по приоритету)

1. ~~Заметка к срыву курения~~ — сделано в 1.1: заметка есть у всех привычек.
2. Экран настроек в финальном дизайне и экспорт/импорт данных в JSON.
3. Виджет с двумя счётчиками.
4. Счётчик сэкономленных денег.
5. Шкала восстановления здоровья.
6. Защита PIN-кодом / Face ID.
7. Тёмная тема (токены вынесены в `src/theme`).

Открытые вопросы ТЗ (уведомления о вехах при закрытом приложении, способ публикации) решает человек, не агент.
