# API Contract v2

Base URL: http://localhost:8080/api/v1

## Заголовки

Все запросы к `/captcha/*` обязаны содержать:

- `X-Client-Id: <uuid>` — стабильный идентификатор клиента (генерится один раз на устройство/профиль и хранится локально).

Без заголовка или с невалидным UUID бэкенд отвечает `403 forbidden`.

## Уровни сложности

`difficultyLevel` — от 1 до 5. Определяется количеством строк:
- 1 — до 4 строк (короткие)
- 2 — 5-8 строк
- 3 — 9-14 строк
- 4 — 15-20 строк
- 5 — больше 20 строк

Сложность растёт по мере успешных решений: чем больше `poemsSolved`, тем выше уровень.

## GET /health
→ { status, service, version }

## GET /poems
→ [{ poemId, title, author, lines[], lineCount, difficultyLevel }]

## GET /captcha/new
Query: ?difficulty=auto (optional, 1-5)
Headers: X-Client-Id (required)
→ 200: {
  requestId,
  type,            // "RETYPE" | "FILL_IN"
  poemId,
  title,
  author,
  displayText,     // готовый к показу текст; для FILL_IN содержит "_____" в местах пропусков
  lines[],         // исходные строки стихотворения
  lineCount,
  difficultyLevel
}

- `auto` (по умолчанию) — сложность считается по истории клиента (по `X-Client-Id`).
- `1`-`5` — принудительно задать уровень.

`type`:
- `RETYPE` — пользователь перепечатывает стихотворение целиком.
- `FILL_IN` — пользователь заполняет пропуски; в `displayText` пропуски отмечены `_____` (5 подчёркиваний).

## POST /captcha/refresh
Headers: X-Client-Id (required)
← { requestId }
→ 200: тот же формат, что у `/captcha/new`

Бэкенд сначала инвалидирует переданный `requestId`, затем выдаёт новую капчу. Если переданный `requestId` уже недействителен (истёк/отменён/использован), старый просто игнорируется и возвращается новый — клиент получает успешный ответ в любом случае, кроме инфраструктурных ошибок (`503`).

## POST /captcha/verify
Headers: X-Client-Id (required)
← { requestId, poemId, userInput }
→ 200: { requestId, blockedUntil, poemsSolved, nextDifficulty }
→ 422: { code: "MISMATCH", message, details: { attemptsLeft } }

Если `details.attemptsLeft === 0`, капча считается исчерпанной: `requestId` больше не действителен, клиент должен запросить новую (`/captcha/new` или `/captcha/refresh`).

## Коды ошибок

Единый формат тела ошибки:

    { code: string, message: string, details?: object }

- `400 bad_request` — некорректное тело запроса (невалидный JSON, отсутствуют обязательные поля).
- `403 forbidden` — отсутствует или невалиден `X-Client-Id`, либо `requestId` принадлежит другому клиенту.
- `404 not_found` — `requestId` не существует.
- `409 conflict` — `requestId` уже использован или отменён.
- `410 expired` — срок жизни капчи истёк.
- `422 mismatch` — неверный ответ; `details.attemptsLeft` — сколько попыток осталось.
- `503 unavailable` — нет стихотворений подходящего уровня; клиент может попробовать уровень ниже.