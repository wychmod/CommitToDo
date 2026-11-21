import { currentTzOffset, systemClock, toLocalDate } from '@/core/clock';
import {
  buildAnonymousStatsPayload,
  isStatsDue,
  previousLocalDate,
  pruneStatsQueue,
  type AnonymousStatsPayload,
} from '@/core/rules/anonymous-stats';
import { sendAnonymousCount } from './cloud/sync';
import { db } from './db';
import { detectPlatform } from './devices';

/**
 * 匿名统计开关与上报（PRD V2-02 OP-08 / J-07）。
 *
 * 默认关闭；开启后次日首次进入工作区上报前一日计数，当日不重复。
 * 失败静默保留在队列（最多 7 天），关闭开关立即清空未发送队列。
 */

const ENABLED_KEY = 'committodo.stats.enabled';
const INSTALL_KEY = 'committodo.stats.install';
const LAST_KEY = 'committodo.stats.lastReported';
const QUEUE_KEY = 'committodo.stats.queue';

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
    // 浏览器禁用存储时只在本次会话内生效。
  }
}

export function isStatsEnabled(): boolean {
  return read(ENABLED_KEY) === 'on';
}

/** 关闭即停止上报并清空未发送队列；不影响同步与其他功能。 */
export function setStatsEnabled(enabled: boolean): void {
  write(ENABLED_KEY, enabled ? 'on' : null);
  if (!enabled) write(QUEUE_KEY, null);
}

export function getLastReportedDate(): string | null {
  return read(LAST_KEY);
}

function getInstallId(): string {
  const stored = read(INSTALL_KEY);
  if (stored) return stored;
  const next =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `install-${Date.now().toString(36)}`;
  write(INSTALL_KEY, next);
  return next;
}

function readQueue(): AnonymousStatsPayload[] {
  const raw = read(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is AnonymousStatsPayload =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as { localDate?: unknown }).localDate === 'string',
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly AnonymousStatsPayload[]): void {
  write(QUEUE_KEY, queue.length > 0 ? JSON.stringify(queue) : null);
}

/** 只数当日有效提交与有有效提交的分支，不读取标题、备注或分支名。 */
export async function collectDailyCounts(
  date: string,
  ownerId: string,
): Promise<{ commitCount: number; activeBranchCount: number }> {
  const commits = await db.commits.where('ownerId').equals(ownerId).toArray();
  const live = commits.filter(
    (commit) => commit.deletedAt === null && commit.voidedAt === null && commit.date === date,
  );
  return {
    commitCount: live.length,
    activeBranchCount: new Set(live.map((commit) => commit.branchId)).size,
  };
}

async function sendQueued(): Promise<void> {
  const queue = pruneStatsQueue(
    readQueue(),
    toLocalDate(systemClock.now(), currentTzOffset(systemClock.now())),
  );
  const remaining: AnonymousStatsPayload[] = [];
  let blocked = false;

  for (const payload of queue) {
    if (blocked) {
      remaining.push(payload);
      continue;
    }
    const result = await sendAnonymousCount(payload);
    if (!result.ok) {
      blocked = true;
      remaining.push(payload);
      continue;
    }
    const previous = read(LAST_KEY);
    if (previous === null || payload.localDate > previous) write(LAST_KEY, payload.localDate);
  }

  writeQueue(remaining);
}

/**
 * 进入工作区时调用：开关关闭或当日已上报则直接返回，不提示、不阻塞。
 */
export async function reportAnonymousStats(ownerId: string): Promise<void> {
  if (!isStatsEnabled()) return;

  const now = systemClock.now();
  const today = toLocalDate(now, currentTzOffset(now));
  const last = read(LAST_KEY);

  if (isStatsDue(last, today)) {
    const date = previousLocalDate(today);
    const counts = await collectDailyCounts(date, ownerId);
    const payload = buildAnonymousStatsPayload({
      installId: getInstallId(),
      localDate: date,
      commitCount: counts.commitCount,
      activeBranchCount: counts.activeBranchCount,
      appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
      platform: detectPlatform(),
    });
    const queue = readQueue().filter((row) => row.localDate !== date);
    writeQueue([...queue, payload]);
  }

  await sendQueued();
}
