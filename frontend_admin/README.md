# Doomscroll Blocker · админ-панель

Отдельный React + TypeScript сайт для управления стихами. К расширению отношения не имеет.
Полная инструкция по запуску и работе с админкой — в [корневом README](../README.md#админка).

## Запуск
```bash
docker compose up -d --build          # из корня репозитория: бэкенд + админка, http://localhost:5174
# или на хосте, когда бэкенд уже работает на :8080:
cd frontend_admin
npm ci
npm run dev
```

## Как устроено
- Vite проксирует `/api` на бэкенд (`API_PROXY_TARGET`, по умолчанию `http://localhost:8080`;
  в Docker — `http://backend:8080`). На бэке нет CORS, а сессия и CSRF живут в cookie,
  поэтому браузер должен видеть один origin. В проде нужен такой же reverse-proxy.
- Вход: `POST /auth/login` в формате `application/x-www-form-urlencoded` (так требует `AdminAuthController`).
- CSRF: токен приходит из `/auth/csrf` и уходит заголовком `X-XSRF-TOKEN` на каждый POST/PUT/PATCH.
- Список — серверная пагинация (8 на странице).

## Тесты
`npm test` — клиент (CSRF, 204, ошибки) и интерфейс на фейковом бэкенде (`src/test/fakeBackend.ts`).
