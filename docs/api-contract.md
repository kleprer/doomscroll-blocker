# API Contract v2.1

Base URL: `http://localhost:8080/api/v1`

Источник истины — код бэка (`CaptchaController`, `ChallengeService`, `GlobalExceptionHandler`).
Меняется формат — правим этот файл в том же PR.

## Заголовок X-Client-Id

Все `/captcha/*` требуют `X-Client-Id: <UUID>`. Расширение генерирует его один раз
(`crypto.randomUUID()`) и хранит в `chrome.storage.local`. Прогресс (`poemsSolved`,
сложность `auto`) считается на бэке **по этому id**.

> ⚠ TODO(backend): сейчас без заголовка / с не-UUID бэк отвечает **500**
> (нет обработчика `MissingRequestHeaderException` / `MethodArgumentTypeMismatchException`
> в `GlobalExceptionHandler`). Должно быть **400**. Клиент всегда шлёт валидный id.

## Уровни сложности

`difficultyLevel` 1–5 по числу непустых строк: 1 — до 4, 2 — 5–8, 3 — 9–14, 4 — 15–20, 5 — больше 20.
`auto` = `min(5, 1 + poemsSolved / 3)`.

## GET /health
→ `{ status, service, version }`

## GET /poems
→ `[{ poemId, title, author, lines[], lineCount, difficultyLevel }]` (только активные)

## GET /captcha/new?difficulty=auto|1..5
Header: `X-Client-Id`

→ 200
```
{ requestId, poemId, type: "RETYPE"|"FILL_IN", title, author,
  lines[], displayText, lineCount, difficultyLevel }
```
- Показывать нужно `displayText`. В `lines` пустые строки удалены.
- `RETYPE` — перепечатать `displayText` целиком (с переносами и пустыми строками).
- `FILL_IN` — пропуски `_____`: 1 (уровни 1–2), 2 (3–4) или 3 (5). Ответ — слова
  **по порядку через пробел**.
- Время жизни — 15 минут, попыток — 3.
- 400 — неверный `difficulty`; 503 — нет стихов этого уровня.

## POST /captcha/refresh
Header: `X-Client-Id`. Body: `{ requestId }`

Отменяет активное задание и выдаёт новое (`difficulty=auto`) → 200, формат как у `/captcha/new`.

| Код | Причина |
|-----|---------|
| 403 | задание другого клиента |
| 404 | задания нет |
| 409 | уже решено / отменено |
| 410 | просрочено или попытки исчерпаны |
| 503 | нет стихов. **Старое задание при этом уже отменено** — клиент обязан запросить `/captcha/new` |

Клиент при 403/404/409/410/503 сам откатывается на `/captcha/new`.

## POST /captcha/verify
Header: `X-Client-Id`. Body: `{ requestId, poemId, userInput }`

→ 200 `{ requestId, blockedUntil (ISO-8601, UTC), poemsSolved, nextDifficulty }`

Сравнение: `strip`, `\r\n→\n`, серии пробелов/табов → один пробел, `lowercase`.
После решения пауза — 15 минут.

| Код | Когда | Клиент |
|-----|-------|--------|
| 422 | неверно: `{ code:"MISMATCH", message, details:{ attemptsLeft } }` | «осталось N»; при `0` — новое задание |
| 410 | просрочено / попытки исчерпаны | новое задание |
| 409 | уже решено / отменено | новое задание |
| 404 | не найдено | новое задание |
| 403 | чужое задание | новое задание |
| 400 | кривое тело / `poemId` не от этого задания | показать сообщение |

## Формат ошибок
Все ошибки, **кроме 422**: `{ status, error, message, path, timestamp }`.
422: `{ code, message, details: { attemptsLeft } }`.

## Admin API (использует отдельный админ-сайт, расширение — нет)
Сессия (cookie `JSESSIONID`, Redis) + CSRF. CORS на бэке не настроен → админка ходит через прокси того же origin.

| Метод | Путь | Заметки |
|-------|------|---------|
| GET | `/admin/auth/csrf` | `{ token, headerName, parameterName }`; ставит cookie `XSRF-TOKEN` |
| POST | `/admin/auth/login` | `application/x-www-form-urlencoded`: `username`, `password`; + заголовок `X-XSRF-TOKEN`; 401 при неверных |
| GET | `/admin/auth/me` | `{ username, role }` или 401 |
| POST | `/admin/auth/logout` | + `X-XSRF-TOKEN` |
| GET | `/admin/poems?page=&size=` | `Page<{ id, author, title, content, source, isActive, createdAt }>` |
| GET | `/admin/poems/active` | то же, только активные |
| GET | `/admin/poems/{id}` | одно |
| POST | `/admin/poems` | `{ author, title, content, source }` (все `@NotBlank`) → 201 |
| PUT | `/admin/poems/{id}` | то же тело |
| PATCH | `/admin/poems/{id}/activate` · `/deactivate` | → 204 |

Удаления нет — только деактивация. Первый админ создаётся при старте из
`ADMIN_INIT_USERNAME` / `ADMIN_INIT_PASSWORD` (**пароль ≥ 12 символов**, иначе бэк не стартует).
