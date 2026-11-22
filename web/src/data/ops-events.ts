import { currentTzOffset, systemClock, toLocalDate } from '@/core/clock';
import { backoffDelay } from '@/core/rules/sync-backoff';
import { sendOpsEventBatch, type OpsEventWire } from './cloud/ops-event';
import { defaultWriteDeps } from './deps';
import { getDeviceId } from './devices';
import { isStatsEnabled } from './anonymous-stats';

/**
 * 行为事件上报（admin/DESIGN.md §12）。
 *
 * 约束：
 * - 未登录（未启动上报）或未同意匿名统计时一律不入队、不发送；
 * - 业务成功后再调用，全部 fire-and-forget，不改变用例返回值与事务边界；
 * - 失败静默保留本地队列，按指数退避重试，单批不超过 20 条；
 * - 只带白名单 props，不采集标题、备注、邮箱、分支名等自由文本。
 */

const QUEUE_KEY = 'committodo.ops.queue';
const DAILY_KEY = 'committodo.ops.daily';
const MAX_QUEUE = 200;
const MAX_BATCH = 20;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_FLOOR_MS = 2_000;

export type OpsProps = Record<string, string | number | boolean>;

export type OpsEventName =
  | 'app.open'
  | 'account.signup'
  | 'sync.push'
  | 'backup.upload'
  | 'commit.create'
  | 'task.complete'
  | 'branch.create'
  | 'milestone.create'
  | 'badge.grant'
  | 'review.open';

interface QueueItem {
  /** 幂等键：普通事件为 eventId，按日事件为空串。 */
  eventId: string;
  event: OpsEventName;
  props?: OpsProps;
  localDate: string;
  tzOffset: number;
  at: number;
  attempts: number;
  nextAt: number;
}

const DAILY_EVENTS = new Set<OpsEventName>(['app.open', 'account.signup']);

let active = false;
let flushing = false;
let retryTimer: number | null = null;
let cleanupListeners: (() => void) | null = null;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 存储不可用时只在本次会话内生效。
  }
}

function readQueue(): QueueItem[] {
  const raw = read(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is QueueItem =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as QueueItem).event === 'string' &&
        typeof (row as QueueItem).localDate === 'string',
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly QueueItem[]): void {
  write(QUEUE_KEY, queue.length > 0 ? JSON.stringify(queue) : null);
}

function readDaily(): Record<string, string> {
  const raw = read(DAILY_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** 同一天的同名按日事件只入队一次，跨标签页由服务端 `_id` 再兜底。 */
function claimDaily(event: OpsEventName, date: string): boolean {
  const daily = readDaily();
  if (daily[event] === date) return false;
  daily[event] = date;
  write(DAILY_KEY, JSON.stringify(daily));
  return true;
}

function scheduleFlush(delay: number): void {
  if (!active) return;
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(
    () => {
      retryTimer = null;
      void flushOpsEvents();
    },
    Math.max(0, delay),
  );
}

function wireOf(item: QueueItem): OpsEventWire {
  return {
    event: item.event,
    eventId: item.eventId || undefined,
    props: item.props,
    platform: 'web',
    appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
    localDate: item.localDate,
    tzOffset: item.tzOffset,
    deviceId: getDeviceId(),
  };
}

/** 业务成功后调用；未登录或未同意统计时直接返回。 */
export function trackOpsEvent(event: OpsEventName, props?: OpsProps): void {
  if (!active || !isStatsEnabled()) return;
  const now = systemClock.now();
  const tzOffset = currentTzOffset(now);
  const localDate = toLocalDate(now, tzOffset);
  const daily = DAILY_EVENTS.has(event);
  if (daily && !claimDaily(event, localDate)) return;

  const item: QueueItem = {
    eventId: daily ? '' : defaultWriteDeps.ids.ulid(now),
    event,
    props,
    localDate,
    tzOffset,
    at: now,
    attempts: 0,
    nextAt: 0,
  };

  const queued = [...readQueue(), item].slice(-MAX_QUEUE);
  writeQueue(queued);
  scheduleFlush(0);
}

/** 发送一批就绪事件；失败静默，按 attempts 退避。 */
export async function flushOpsEvents(): Promise<void> {
  if (!active || !isStatsEnabled() || flushing) return;
  const now = systemClock.now();
  const ready = readQueue()
    .filter((item) => item.nextAt <= now && now - item.at <= MAX_AGE_MS)
    .slice(0, MAX_BATCH);
  if (ready.length === 0) return;

  flushing = true;
  const outcome = await sendOpsEventBatch(ready.map(wireOf)).finally(() => {
    flushing = false;
  });

  const sent = new Set(ready.map(keyOf));
  const all = readQueue().filter((item) => now - item.at <= MAX_AGE_MS);

  if (outcome.ok || !outcome.retriable) {
    writeQueue(all.filter((item) => !sent.has(keyOf(item))));
    if (outcome.ok) scheduleFlush(0);
    return;
  }

  const failed = all.map((item) =>
    sent.has(keyOf(item))
      ? { ...item, attempts: item.attempts + 1, nextAt: now + backoffDelay(item.attempts + 1) }
      : item,
  );
  writeQueue(failed);
  const wait = Math.max(RETRY_FLOOR_MS, ...failed.map((item) => item.nextAt - now));
  scheduleFlush(wait);
}

function keyOf(item: QueueItem): string {
  return `${item.event}:${item.eventId || item.localDate}`;
}

export function isOpsReportingActive(): boolean {
  return active;
}

/**
 * 登录后启动：上报一次 `app.open`，并在可见/联网时补发队列。
 * 退出登录或卸载时停止，队列保留到下次登录。
 */
export function startOpsReporting(): () => void {
  if (active) return cleanupListeners ?? (() => undefined);
  active = true;
  trackOpsEvent('app.open');
  void flushOpsEvents();

  const onVisible = () => {
    if (document.visibilityState === 'visible') void flushOpsEvents();
  };
  const onOnline = () => void flushOpsEvents();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);

  cleanupListeners = () => {
    active = false;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = null;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    cleanupListeners = null;
  };
  return cleanupListeners;
}
