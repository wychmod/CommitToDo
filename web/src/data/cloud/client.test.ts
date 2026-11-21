import { describe, expect, it } from 'vitest';
import { createCloudBaseApp, getCloudBaseApp } from './client';

describe('cloudbase client', () => {
  it('creates an app for an explicit env id', () => {
    const app = createCloudBaseApp({ envId: 'committodo-test' });
    expect(typeof app.callFunction).toBe('function');
  });

  it.runIf(Boolean(import.meta.env.VITE_CLOUDBASE_ENV_ID))(
    'reuses one app instance for the configured env',
    () => {
      expect(getCloudBaseApp()).toBe(getCloudBaseApp());
    },
  );
});
