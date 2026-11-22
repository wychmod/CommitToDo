import type { Result } from '@/core/errors';
import { backoffDelay } from '@/core/rules/sync-backoff';

/**
 * 轮询循环（PRD V2-02 入站同步，方案 B）。
 *
 * 默认 3 秒一次；页面不可见或离线时不发请求，只保留定时检查；
 * 失败按既有退避拉长间隔，游标由调用方保留，恢复后从原游标续传。
 */

export const PULL_INTERVAL_MS = 3_000;

export interface PullLoopOptions {
  run: () => Promise<Result<unknown>>;
  intervalMs?: number;
  backoff?: (failures: number) => number;
  isHidden?: () => boolean;
  isOnline?: () => boolean;
  setTimer?: (callback: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}

export interface PullLoop {
  start: () => void;
  stop: () => void;
  /** 页面重新可见或网络恢复时立即补一次。 */
  poke: () => void;
}

export function createPullLoop(options: PullLoopOptions): PullLoop {
  const intervalMs = options.intervalMs ?? PULL_INTERVAL_MS;
  const backoff = options.backoff ?? backoffDelay;
  const isHidden = options.isHidden ?? (() => false);
  const isOnline = options.isOnline ?? (() => true);
  const setTimer = options.setTimer ?? ((callback, ms) => window.setTimeout(callback, ms));
  const clearTimer = options.clearTimer ?? ((id) => window.clearTimeout(id));

  let timer: number | null = null;
  let stopped = true;
  let running = false;
  let failures = 0;

  const clear = (): void => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const schedule = (delay: number): void => {
    clear();
    if (stopped) return;
    timer = setTimer(() => {
      timer = null;
      void tick();
    }, delay);
  };

  const tick = async (): Promise<void> => {
    if (stopped || running) return;
    if (isHidden() || !isOnline()) {
      schedule(intervalMs);
      return;
    }
    running = true;
    let result: Result<unknown> | null = null;
    try {
      result = await options.run();
    } catch {
      result = null;
    }
    running = false;
    if (stopped) return;
    if (result?.ok) {
      failures = 0;
      schedule(intervalMs);
      return;
    }
    failures += 1;
    schedule(Math.max(intervalMs, backoff(failures)));
  };

  return {
    start: () => {
      stopped = false;
      schedule(0);
    },
    stop: () => {
      stopped = true;
      clear();
    },
    poke: () => {
      if (!stopped) schedule(0);
    },
  };
}
