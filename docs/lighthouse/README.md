# Регулярная проверка Lighthouse

Ночью GitHub Actions прогоняет [Lighthouse CLI](https://developer.chrome.com/docs/lighthouse/overview/)
по ключевым страницам приложения, а утром команда смотрит отчёт и решает, нужны ли правки.

## Как это работает

Workflow: [`.github/workflows/lighthouse.yml`](../../.github/workflows/lighthouse.yml)

| Триггер | Когда | Что делает |
|---|---|---|
| `schedule` (`cron: "0 14 * * *"`) | сейчас 17:00 MSK (временно, для проверки; потом вернуть на ночь) | собирает приложение, поднимает сервер, аудит, создаёт issue с отчётом |
| `workflow_dispatch` | вручную из вкладки **Actions → Lighthouse → Run workflow** | то же самое; можно указать `target_url`, чтобы проверить уже задеплоенный адрес |

Шаги job'а:

1. `npm ci`, `npm run generate-api-types`, `npm run build`, `npm run build:backend`.
2. Собранный SPA кладётся в `server/dist/public`, Fastify-сервер поднимается на `:4010`
   (SPA + API на одном origin, как в Docker-образе), БД — in-memory.
3. `npx lighthouse` по адресам `/` и `/owner`, пресет `desktop`, категории
   performance / accessibility / best-practices / seo. На каждый URL — HTML + JSON отчёт.
4. `scripts/lighthouse-summary.mjs` превращает JSON в Markdown-таблицу со счётом и
   списком главных проблем.

## Где смотреть отчёт утром

- **Issue** с меткой `lighthouse` и заголовком `Lighthouse report — YYYY-MM-DD` —
  создаётся автоматически после ночного прогона, содержит таблицу счёта, топ проблем
  и чек-лист «Требуемые правки». Создаётся только для запусков по расписанию.
- **Job Summary** прогона (Actions → нужный run) — та же таблица.
- **Артефакт** `lighthouse-report-<N>` — полные HTML-отчёты Lighthouse (открыть в браузере)
  и JSON. Хранится 30 дней.

## Что делать по итогам

1. Открыть свежую issue `Lighthouse report — …`.
2. В разделе «Требуемые правки» отметить, что действительно надо чинить.
3. Принятые пункты перенести в [`findings.md`](./findings.md) и завести обычные задачи
   (`fix:` / `perf:` коммиты).
4. Закрыть issue, когда решения зафиксированы.

## Запуск вручную

- **Из GitHub:** Actions → **Lighthouse** → **Run workflow**. Поле `target_url` пустое —
  соберётся и проверится локальная сборка; заполнено — проверится указанный URL.
- **Локально:**
  ```bash
  npm run build && npm run build:backend && cp -r dist server/dist/public
  NODE_ENV=production BOOKING_DB_PATH=":memory:" node server/dist/index.js &
  npx lighthouse http://localhost:4010/ --view --preset=desktop
  ```
