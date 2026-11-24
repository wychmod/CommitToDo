import { fail, ok, type Result } from '@/core/errors';

/**
 * 异地备份的云端适配（PRD V1-06 OP-07）。
 *
 * 只做整包上传、下载与删除，不解析、不合并、不回写本机，也不参与同步与 outbox。
 * 云端未配置或网络失败一律返回可重试的 `storage.write_failed`，调用方据此
 * 保留本机数据并避免生成空记录。
 *
 * 云函数要求调用者已登录，对象键固定在 `remote-backups/<uid>/...` 下；
 * 未登录、旧格式键与越权键都按不可重试失败返回，界面不提供重试按钮。
 */

const FUNCTION_NAME = 'backup-sign';

interface CallResult {
  ok?: unknown;
  code?: unknown;
  message?: unknown;
  remoteKey?: unknown;
  url?: unknown;
}

/** 云函数的结构化失败；`code` 用于区分「没登录」与「网络抖动」。 */
interface BackupFailure {
  code: string;
  retriable: boolean;
}

const NON_RETRIABLE_CODES = new Set([
  'unauthenticated',
  'backup.invalid_key',
  'backup.legacy_key',
  'backup.empty_payload',
  'backup.too_large',
  'backup.unknown_action',
]);

async function callBackupFunction(data: Record<string, unknown>): Promise<CallResult> {
  // 按需加载 CloudBase SDK：MVP 的其它页面不为异地备份付出首屏体积。
  const { getCloudBaseApp } = await import('./client');
  const app = getCloudBaseApp();
  const response = await app.callFunction({ name: FUNCTION_NAME, data });
  const result = (response as { result?: unknown }).result;
  return typeof result === 'object' && result !== null ? (result as CallResult) : {};
}

function failureOf(result: CallResult): BackupFailure | null {
  if (result.ok !== false) return null;
  const code = typeof result.code === 'string' ? result.code : 'backup.failed';
  return { code, retriable: !NON_RETRIABLE_CODES.has(code) };
}

export interface UploadRemotePackageInput {
  deviceId: string;
  requestId: string;
  text: string;
}

export async function uploadRemotePackage(
  input: UploadRemotePackageInput,
): Promise<Result<{ remoteKey: string }>> {
  try {
    const result = await callBackupFunction({
      action: 'upload',
      deviceId: input.deviceId,
      requestId: input.requestId,
      text: input.text,
    });
    const failure = failureOf(result);
    if (failure) return fail('storage.write_failed', failure);
    if (typeof result.remoteKey !== 'string' || result.remoteKey.length === 0) {
      return fail('storage.write_failed', { retriable: true });
    }
    return ok({ remoteKey: result.remoteKey });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

export async function downloadRemotePackage(
  remoteKey: string,
  signal?: AbortSignal,
): Promise<Result<{ text: string }>> {
  try {
    const result = await callBackupFunction({ action: 'download', remoteKey });
    const failure = failureOf(result);
    if (failure) return fail('storage.write_failed', failure);
    if (typeof result.url !== 'string' || result.url.length === 0) {
      return fail('storage.write_failed', { retriable: true });
    }
    const response = await fetch(result.url, { signal });
    if (!response.ok) return fail('storage.write_failed', { retriable: true });
    const text = await response.text();
    if (text.length === 0) return fail('storage.write_failed', { retriable: true });
    return ok({ text });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

export async function deleteRemotePackage(remoteKey: string): Promise<Result<null>> {
  try {
    const result = await callBackupFunction({ action: 'delete', remoteKey });
    const failure = failureOf(result);
    if (failure) return fail('storage.write_failed', failure);
    return ok(null);
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
