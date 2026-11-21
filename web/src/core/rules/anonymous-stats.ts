/**
 * 匿名统计上报包（PRD V2-02 OP-08 / §8.2 J-07）。
 *
 * 只上报计数器：安装标识、本地日期、当日有效提交数、当日活跃分支数、版本与平台。
 * 白名单之外的键一律丢弃，标题、分支名、备注、实体 ID、账号 ID 与邮箱都不进入 payload。
 */

export const STATS_PAYLOAD_KEYS = [
  'installId',
  'localDate',
  'commitCount',
  'activeBranchCount',
  'appVersion',
  'platform',
] as const;

export interface AnonymousStatsPayload {
  installId: string;
  localDate: string;
  commitCount: number;
  activeBranchCount: number;
  appVersion: string;
  platform: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * 逐键白名单取值，返回对象的键集合恰好等于 `STATS_PAYLOAD_KEYS`。
 * 上下文里即便混入标题、分支名或整个账号对象，也不会被带出去。
 */
export function buildAnonymousStatsPayload(
  context: Record<string, unknown>,
): AnonymousStatsPayload {
  return {
    installId: text(context.installId),
    localDate: text(context.localDate),
    commitCount: count(context.commitCount),
    activeBranchCount: count(context.activeBranchCount),
    appVersion: text(context.appVersion),
    platform: text(context.platform),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDay(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  const value = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return Number.isFinite(value) ? value : null;
}

/** 队列最多保留 7 天：只留最近七个本地日期（含今天）内的条目。 */
export function pruneStatsQueue<T extends { localDate: string }>(
  queue: readonly T[],
  todayDate: string,
): T[] {
  const today = toUtcDay(todayDate);
  if (today === null) return [];
  const earliest = today - (7 - 1) * DAY_MS;
  return queue.filter((item) => {
    const day = toUtcDay(item.localDate);
    return day !== null && day >= earliest && day <= today;
  });
}

/** 距今最近一个应上报的日期（前一日）；`lastReported` 已等于它时不重复上报。 */
export function previousLocalDate(todayDate: string): string {
  const today = toUtcDay(todayDate);
  if (today === null) return todayDate;
  return new Date(today - DAY_MS).toISOString().slice(0, 10);
}

export function isStatsDue(lastReported: string | null, todayDate: string): boolean {
  return lastReported !== previousLocalDate(todayDate);
}
