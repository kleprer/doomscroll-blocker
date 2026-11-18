# Doomscroll Blocker

Расширение блокирует думскроллинг через капчу со стихотворениями.

## Стек
- Backend: Spring Boot 4, Mongo, Redis (сессии админки), порт 8080
- Frontend: React 19 + TypeScript + Vite + CRXJS (Manifest V3)

## API (v2)

Base URL: `http://localhost:8080/api/v1`

Все запросы к `/captcha/*` требуют заголовок `X-Client-Id: <uuid>`.

- `GET  /health` → `{ status, service, version }`
- `GET  /poems` → `[{ poemId, title, author, lines[], lineCount, difficultyLevel }]`
- `GET  /captcha/new?difficulty=auto|1..5` → `{ requestId, type, poemId, title, author, displayText, lines[], lineCount, difficultyLevel }`
- `POST /captcha/refresh` ← `{ requestId }` → тот же ответ, что у `/captcha/new`
- `POST /captcha/verify` ← `{ requestId, poemId, userInput }` → `{ requestId, blockedUntil, poemsSolved, nextDifficulty }`

`type`: `RETYPE` (перепечатать целиком) или `FILL_IN` (заполнить `_____` в `displayText`).

Коды ошибок: `400`, `403`, `404`, `409`, `410`, `422` (`details.attemptsLeft`), `503`. Подробнее в `docs/api-contract.md`.

## Запуск
```bash
cp .env.example .env              # пароль админа — минимум 12 символов, иначе бэк не стартует
docker compose up --build         # mongo + redis + backend на :8080
cd frontend && npm ci && npm run dev
# chrome://extensions → Режим разработчика → «Загрузить распакованное» → frontend/dist
```

## Тесты фронта
```bash
cd frontend && npm test
```
