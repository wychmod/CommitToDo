import { localDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { exportFileName } from '@/core/rules/export-file';
import { downloadRemotePackage } from './cloud/backup-store';
import { db } from './db';
import type { Backup } from './types';

export interface DownloadRemoteBackupResult {
  text: string;
  fileName: string;
}

/**
 * 下载异地备份（PRD V1-06 OP-07）。
 *
 * 只把远端文件取回并交给浏览器下载，不写本机、不解析正文；
 * 下载后由用户走 M10 的从文件恢复。失败时不进入恢复流程，现有数据不变。
 */
export async function downloadRemoteBackup(
  input: { backupId: string },
  signal?: AbortSignal,
): Promise<Result<DownloadRemoteBackupResult>> {
  const target: Backup | undefined = await db.backups.get(input.backupId);
  if (!target || target.kind !== 'remote' || !target.remoteKey) {
    return fail('domain.not_found');
  }

  const downloaded = await downloadRemotePackage(target.remoteKey, signal);
  if (!downloaded.ok) return downloaded;

  return ok({
    text: downloaded.value.text,
    fileName: exportFileName(localDate(target.createdAt)),
  });
}
