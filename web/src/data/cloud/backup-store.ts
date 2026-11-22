import { fail, ok, type Result } from '@/core/errors';

/**
 * 异地备份的云端适配（PRD V1-06 OP-07）。
 *
 * 只做整包上传、下载与删除，不解析、不合并、不回写本机，也不参与同步与 outbox。
 * 云端未配置或网络失败一律返回可重试的 `storage.write_failed`，调用方据此
 * 保留本机数据并避免生成空记录。
 */

const FUNCTION_NAME = 'backup-sign';

interface CallResult {
  remoteKey?: unknown;
  url?: unknown;
}

async function callBackupFunction(data: Record<string, unknown>): Promise<CallResult> {
  // 按需加载 CloudBase SDK：MVP 的其它页面不为异地备份付出首屏体积。
  const { getCloudBaseApp } = await import('./client');
  const app = getCloudBaseApp();
  const response = await app.callFunction({ name: FUNCTION_NAME, data });
  const result = (response as { result?: unknown }).result;
  return typeof result === 'object' && result !== null ? (result as CallResult) : {};
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
    await callBackupFunction({ action: 'delete', remoteKey });
    return ok(null);
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
