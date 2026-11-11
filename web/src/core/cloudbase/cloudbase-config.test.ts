import { readCloudBaseAuthFeatures } from './cloudbase-config';

it('keeps optional providers disabled unless explicitly enabled', () => {
  vi.stubEnv('VITE_AUTH_PHONE_ENABLED', 'false');
  vi.stubEnv('VITE_AUTH_GITHUB_ENABLED', 'false');

  expect(readCloudBaseAuthFeatures()).toEqual({ phone: false, github: false });
});

it('enables optional providers only with an explicit true flag', () => {
  vi.stubEnv('VITE_AUTH_PHONE_ENABLED', 'true');
  vi.stubEnv('VITE_AUTH_GITHUB_ENABLED', 'true');

  expect(readCloudBaseAuthFeatures()).toEqual({ phone: true, github: true });
});
