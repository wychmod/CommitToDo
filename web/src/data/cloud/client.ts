import cloudbase from '@cloudbase/js-sdk';

/**
 * CloudBase Web SDK 的唯一入口（TECH §5.7：`@cloudbase/*` 只允许出现在 `src/data/cloud/**`）。
 * MVP 不依赖云端，因此该模块不被应用运行时引用；V1 起由仓储层从这里取 app 实例。
 */

export type CloudBaseApp = ReturnType<typeof cloudbase.init>;

export interface CloudBaseClientConfig {
  envId: string;
  region?: string;
}

let app: CloudBaseApp | undefined;

export function createCloudBaseApp(config: CloudBaseClientConfig): CloudBaseApp {
  return cloudbase.init({ env: config.envId, region: config.region });
}

export function getCloudBaseApp(): CloudBaseApp {
  if (app) {
    return app;
  }
  const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID;
  if (!envId) {
    throw new Error('cloud.not_configured');
  }
  app = createCloudBaseApp({
    envId,
    region: import.meta.env.VITE_CLOUDBASE_REGION,
  });
  return app;
}
