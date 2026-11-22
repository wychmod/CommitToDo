import type { PushOpResult } from '@/data/sync-types';
import { fail, ok, type Result } from '@/core/errors';
import type { AnonymousStatsPayload } from '@/core/rules/anonymous-stats';
import type { Device, OutboxOp } from '../types';

/**
 * 同步的云端适配（PRD V2-02 §8.1 OP-02/OP-05/OP-08）。
 *
 * Web 端不直写数据库：补推、迁移与匿名计数都经云函数。未配置云环境时统一返回
 * `sync.unavailable`，调用方保留 outbox 并在界面给出「同步失败 + 重试」。
 * 函数返回 `{ ok: false, code }`（身份失效、参数不合法）时按不可重试失败处理。
 */

interface CallResult<T> {
  result?: (T & { ok?: boolean; code?: string; message?: string }) | null;
  error?: string;
}

/** 云端返回的行以 `_id` 为主键，落到本机时补回 `id`。 */
function withId(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = { ...(raw as Record<string, unknown>) };
  if (typeof row.id !== 'string' && typeof row._id === 'string') row.id = row._id;
  return row;
}

const FATAL_CODES = new Set([
  'unauthenticated',
  'invalid_op',
  'invalid_collection',
  'payload_invalid',
]);

async function callFunction<T>(name: string, data: Record<string, unknown>): Promise<Result<T>> {
  try {
    const { getCloudBaseApp } = await import('./client');
    const app = getCloudBaseApp();
    const response = (await app.callFunction({ name, data })) as CallResult<T>;
    if (response.error) {
      return fail('sync.failed', { retriable: true, cause: response.error });
    }
    const payload = response.result;
    if (payload && payload.ok === false) {
      const code = String(payload.code ?? '');
      return fail('sync.failed', {
        retriable: !FATAL_CODES.has(code),
        cause: { code, message: payload.message ?? '' },
      });
    }
    return ok((payload ?? ({} as T)) as T);
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'cloud.not_configured') {
      return fail('sync.unavailable', { retriable: true, cause });
    }
    return fail('sync.failed', { retriable: true, cause });
  }
}

export interface PushResponse {
  results: PushOpResult[];
  devices: Device[];
  serverTime: number;
}

export interface PushDevice {
  id: string;
  label: string;
  platform: string;
}

interface RawDevice {
  _id?: string;
  id?: string;
  label?: string;
  platform?: string;
  lastSyncAt?: number | null;
  createdAt?: number;
  removedAt?: number | null;
}

function toDevice(raw: RawDevice, fallbackAt: number): Device {
  return {
    id: raw.id ?? raw._id ?? '',
    ownerId: '',
    label: raw.label ?? '',
    platform: raw.platform ?? '',
    lastSyncAt: raw.lastSyncAt ?? null,
    createdAt: raw.createdAt ?? fallbackAt,
    removedAt: raw.removedAt ?? null,
  };
}

/**
 * 按 `createdAt` 顺序补推；服务端按 `opId` 幂等，并按 `baseRev` 判定过期写入。
 * `device` 用于服务端更新当前设备的最近同步时间。
 */
export async function pushOutbox(
  ops: readonly OutboxOp[],
  device: PushDevice,
): Promise<Result<PushResponse>> {
  const result = await callFunction<{
    results?: Array<PushOpResult & { server?: Record<string, unknown> | null }>;
    devices?: RawDevice[];
    serverTime?: number;
  }>('sync-push', { ops, device });
  if (!result.ok) return result;

  const serverTime = result.value.serverTime ?? Date.now();
  const rows: Array<PushOpResult & { server?: Record<string, unknown> | null }> =
    result.value.results ?? ops.map((op) => ({ opId: op.opId, accepted: true }));
  return ok({
    results: rows.map((row) => ({ ...row, server: withId(row.server ?? null) })),
    devices: (result.value.devices ?? []).map((raw) => toDevice(raw, serverTime)),
    serverTime,
  });
}

/** 首次迁移按集合分页推送；同一批重试由服务端按 `_id` upsert。 */
export async function pushMigrationPage(
  collection: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<Result<{ pushed: number }>> {
  const result = await callFunction<{ pushed?: number }>('migrate-push', { collection, rows });
  if (!result.ok) return result;
  return ok({ pushed: result.value.pushed ?? rows.length });
}

/** 匿名计数：只收白名单字段，服务端按「事件名 + 日期」幂等累加。 */
export async function sendAnonymousCount(payload: AnonymousStatsPayload): Promise<Result<null>> {
  const result = await callFunction<null>('counter-inc', {
    event: 'workspace.daily',
    date: payload.localDate,
    payload,
  });
  return result.ok ? ok(null) : result;
}

/** 设备明细与最近同步时间由服务端维护；读失败时界面只显示本机。 */
export async function fetchDevices(): Promise<Result<Device[]>> {
  const result = await callFunction<{ devices?: RawDevice[] }>('sync-devices', {});
  if (!result.ok) return result;
  const now = Date.now();
  return ok((result.value.devices ?? []).map((raw) => toDevice(raw, now)));
}
