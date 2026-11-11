import { SessionRefreshLock } from './session-refresh-lock';

it('runs concurrent refresh requests as a single flight', async () => {
  const lock = new SessionRefreshLock();
  let calls = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const refresh = async (): Promise<string> => {
    calls += 1;
    await pending;
    return 'session';
  };

  const first = lock.run(refresh);
  const second = lock.run(refresh);
  release?.();

  await expect(Promise.all([first, second])).resolves.toEqual(['session', 'session']);
  expect(calls).toBe(1);
});
