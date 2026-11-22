/**
 * 行为事件上报的云端适配（admin/DESIGN.md §12，ops-event）。
 *
 * 只做一次调用，不重试、不抛出：失败由调用方保留本地队列并退避。
 * 服务端 `ok:false` 的 `retriable` 决定队列是丢弃还是继续重试。
 */

export interface OpsEventWire {
  event: string;
  eventId?: string;
  props?: Record<string, string | number | boolean>;
  platform: 'web';
  appVersion: string;
  localDate: string;
  tzOffset: number;
  deviceId: string;
}

export type OpsSendOutcome =
  { ok: true; accepted: number } | { ok: false; retriable: boolean; code: string };

interface OpsResult {
  ok?: boolean;
  code?: string;
  retriable?: boolean;
  status?: number;
  data?: { accepted?: number; duplicates?: number };
}

interface OpsResponse {
  result?: OpsResult | null;
  error?: string;
}

export async function sendOpsEventBatch(events: readonly OpsEventWire[]): Promise<OpsSendOutcome> {
  if (events.length === 0) return { ok: true, accepted: 0 };
  try {
    const { getCloudBaseApp } = await import('./client');
    const app = getCloudBaseApp();
    const response = (await app.callFunction({
      name: 'ops-event',
      data: { events },
    })) as OpsResponse;
    if (response.error) {
      return { ok: false, retriable: true, code: 'ops.network' };
    }
    const result = response.result;
    if (!result) return { ok: false, retriable: true, code: 'ops.empty_response' };
    if (result.ok === false) {
      return {
        ok: false,
        retriable: result.retriable !== false,
        code: String(result.code || 'ops.rejected'),
      };
    }
    return { ok: true, accepted: Number(result.data?.accepted ?? events.length) };
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'cloud.not_configured') {
      return { ok: false, retriable: false, code: 'ops.unavailable' };
    }
    return { ok: false, retriable: true, code: 'ops.network' };
  }
}
