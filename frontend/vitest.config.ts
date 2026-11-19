import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Отдельный конфиг: в тестах не нужен crx-плагин из vite.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
