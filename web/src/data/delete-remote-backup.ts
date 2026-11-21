import { fail, ok, type Result } from '@/core/errors';
import { deleteRemotePackage } from './cloud/backup-store';
import { db } from './db';
import { backupRepository } from './repositories';

/**
 * 删除远端备份（PRD V1-06 OP-07）。
 *
 * 先删远端文件，成功后再移除本机元数据；远端失败时保留列表行并提示可重试，
 * 不出现「本机以为删了、远端还在」的状态。本机数据与其它快照不受影响。
 */
export async function deleteRemoteBackup(input: { backupId: string }): Promise<Result<null>> {
  const target = await backupRepository.getById(input.backupId);
  if (!target || target.kind !== 'remote' || !target.remoteKey) {
    return fail('domain.not_found');
  }

  const deleted = await deleteRemotePackage(target.remoteKey);
  if (!deleted.ok) return deleted;

  try {
    return await db.transaction('rw', [db.backups], async () => {
      await backupRepository.remove([target.id]);
      return ok(null);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
