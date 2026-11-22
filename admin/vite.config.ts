import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 静态托管不开 rewrite，也不宜把整桶错误文档指向管理站。
// 构建后为每个已注册的页面路由复制一份 index.html，
// 利用 COS 目录自动寻址让深链接与刷新都直接返回 200。
const ADMIN_COLLECTIONS = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
  'settings',
  'year_reviews',
  'users',
  'devices',
  'backups',
  'outbox',
  'conflicts',
  'migration_state',
  'counters',
  'ops_events',
  'events',
  'user_first_seen',
  'admin_audit_log',
];

function spaRouteFallbacks(): Plugin {
  return {
    name: 'admin-spa-route-fallbacks',
    apply: 'build',
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist', import.meta.url));
      const source = join(dist, 'index.html');
      if (!existsSync(source)) return;
      const routes = [
        'tables',
        'audit',
        ...ADMIN_COLLECTIONS.map((collection) => `tables/${collection}`),
      ];
      for (const route of routes) {
        const dir = join(dist, ...route.split('/'));
        mkdirSync(dir, { recursive: true });
        copyFileSync(source, join(dir, 'index.html'));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  // 生产产物部署到独立子路径，避免覆盖 web 的静态托管根目录。
  base: mode === 'production' ? '/admin-console/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react(), spaRouteFallbacks()],
  server: {
    port: 5174,
  },
}));
