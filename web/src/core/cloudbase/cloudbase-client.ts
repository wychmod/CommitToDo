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
    // OAuth callbacks are validated by OAuthCallbackScreen before the SDK
    // exchanges the code. Automatic URL detection would consume the callback
    // before our one-time state check runs.
    auth: { detectSessionInUrl: false },
  });

  return app;
}

export function getCloudBaseAuth(): ReturnType<ReturnType<typeof cloudbase.init>['auth']> {
  return getCloudBaseApp().auth;
}
