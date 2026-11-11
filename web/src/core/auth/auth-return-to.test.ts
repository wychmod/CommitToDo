import { buildLoginReturnTo, sanitizeReturnTo } from './auth-return-to';

describe('sanitizeReturnTo', () => {
  it('accepts an internal path with query and hash', () => {
    expect(sanitizeReturnTo('/repository/r-1/tasks?status=todo#open'))
      .toBe('/repository/r-1/tasks?status=todo#open');
  });

  it.each([
    'https://example.com',
    '//example.com/path',
    '/\\\\example.com',
    '/login',
    '/signup',
    '/workspace%00',
  ])('rejects unsafe returnTo %s', (value) => {
    expect(sanitizeReturnTo(value)).toBe('/workspace');
  });
});

it('builds an encoded login return path', () => {
  expect(buildLoginReturnTo('/settings', '?tab=security', '#events'))
    .toBe('/login?returnTo=%2Fsettings%3Ftab%3Dsecurity%23events');
});
