import cloudbase from '@cloudbase/js-sdk';

export type CloudBaseApp = ReturnType<typeof cloudbase.init>;

export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminConfigError';
  }
}

let app: CloudBaseApp | undefined;

/**
 * 管理站唯一的 CloudBase 入口。
 * 前端只使用可公开的环境 ID，不持有任何服务端密钥。
 */
export function getCloudBaseApp(): CloudBaseApp {
  if (app) return app;
  const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID;
  if (!envId) {
    throw new AdminConfigError('cloud.not_configured');
  }
  app = cloudbase.init({
    env: envId,
    region: import.meta.env.VITE_CLOUDBASE_REGION,
  });
  return app;
}

export function adminFunctionName(): string {
  return import.meta.env.VITE_ADMIN_API_FUNCTION || 'admin-api';
}
