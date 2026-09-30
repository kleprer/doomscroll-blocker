# Doomscroll Blocker

Расширение блокирует думскроллинг через капчу со стихотворениями.

## Стек
- Backend: Spring Boot 3, PostgreSQL, порт 8080
- Frontend: React 18 + TypeScript + Vite + CRXJS (Manifest V3)

## API (черновик)
- GET  /api/captcha/new    → { poemId, title, author, lines[] }
- POST /api/captcha/verify → { requestId, poemId, userInput } → { blockedUntil }