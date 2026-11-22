import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // 生产产物部署到独立子路径，避免覆盖 web 的静态托管根目录。
  base: mode === 'production' ? '/admin-console/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react()],
  server: {
    port: 5174,
  },
}));
