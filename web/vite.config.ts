import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react()],
  server: {
    // design/ 在 web/ 之外，令牌与画稿要能被 dev server 读取。
    fs: { allow: ['..'] },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
