import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Адрес бэка: на хосте — localhost, в docker-compose — http://backend:8080
// (задаётся переменной API_PROXY_TARGET). На бэке нет CORS, а сессия и CSRF
// живут в cookie, поэтому админка ходит на /api через прокси того же origin.
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';
const proxy = { '/api': { target, changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  // 127.0.0.1 по умолчанию; в Docker хост задаётся флагом --host 0.0.0.0 (см. Dockerfile)
  server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true, proxy },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
