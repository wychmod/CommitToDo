/**
 * Singleton CloudBase Web SDK client.
 *
 * Initialize once and expose the auth module. Components must not init their
 * own clients.
 */
import cloudbase from '@cloudbase/js-sdk';

import { readCloudBaseAuthConfig } from './cloudbase-config';

let app: ReturnType<typeof cloudbase.init> | null = null;

export function getCloudBaseApp(): ReturnType<typeof cloudbase.init> {
  if (app) return app;

  const config = readCloudBaseAuthConfig();

  app = cloudbase.init({
    env: config.envId,
    region: config.region,
    accessKey: config.publishableKey,
    auth: { detectSessionInUrl: true },
  });

  return app;
}

export function getCloudBaseAuth(): ReturnType<ReturnType<typeof cloudbase.init>['auth']> {
  return getCloudBaseApp().auth;
}
