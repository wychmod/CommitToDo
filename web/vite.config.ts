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
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/data/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['src/data/**/*.test.ts'],
          // CloudBase 用例走浏览器环境，不加载 IndexedDB。
          exclude: ['src/data/cloud/**/*.test.ts'],
          setupFiles: ['./src/test/idb-setup.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        // 强制走浏览器构建：Vitest 默认按 node 条件解析，会拿到在 Node 24 下不可用的 index.node.esm.js。
        resolve: {
          alias: {
            '@cloudbase/js-sdk': fileURLToPath(
              new URL('./node_modules/@cloudbase/js-sdk/dist/index.esm.js', import.meta.url),
            ),
          },
        },
        test: {
          // CloudBase SDK 的 Node 构建入口在 Node 24 下不可用（graceful-fs 报错），
          // 故单列一个浏览器环境项目，验证浏览器入口的初始化。
          name: 'cloud',
          include: ['src/data/cloud/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
