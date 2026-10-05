# API Contract v0.1

Base URL: http://localhost:8080/api/v1

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
→ { poemId, title, author, lines[], lineCount, difficultyLevel }

- `auto` (по умолчанию) — сложность считается по истории сессии
- `1`-`5` — принудительно задать уровень

## POST /captcha/verify
← { requestId, poemId, userInput }
→ 200: { requestId, blockedUntil, poemsSolved, nextDifficulty }
→ 422: { code: "MISMATCH", message, details: { attemptsLeft } }