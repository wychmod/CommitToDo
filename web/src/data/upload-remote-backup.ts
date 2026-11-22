import { fail, ok, type Result } from '@/core/errors';
import { selectExpiredBackupIds } from '@/core/rules/backup-retention';
import { readBackupSnapshot } from './backup-snapshot';
import { deleteRemotePackage, uploadRemotePackage } from './cloud/backup-store';
import { anonymousDeviceId } from './cloud/device';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { trackOpsEvent } from './ops-events';
import { backupRepository } from './repositories';
import type { Backup } from './types';

export interface UploadRemoteBackupInput {
  signal?: AbortSignal;
}

/**
 * 上传异地备份（PRD V1-06 OP-07）。
 *
 * 先把当前数据打包成与导出同结构的明文 JSON，再上传；只有上传成功才写
 * `kind=remote` 元数据，因此断网或取消不会留下空记录。再次上传会替换上一条
 * 异地记录（`remote` 只保留最近 1 条），并尽力删除旧远端文件。
 */
export async function uploadRemoteBackup(
  input: UploadRemoteBackupInput = {},
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Backup>> {
  const snapshot = await readBackupSnapshot(deps);
  if (!snapshot.ok) return snapshot;

  const now = deps.clock.now();
  const requestId = deps.ids.ulid(now);
  const uploaded = await uploadRemotePackage({
    deviceId: anonymousDeviceId(),
    requestId,
    text: snapshot.value.text,
  });
  if (!uploaded.ok) {
    trackOpsEvent('backup.upload', { result: 'failed', errorCode: uploaded.error.code });
    return uploaded;
  }

  if (input.signal?.aborted) {
    await deleteRemotePackage(uploaded.value.remoteKey);
    return fail('storage.write_failed', { retriable: true, field: 'cancelled' });
  }

  try {
    const result = await db.transaction('rw', [db.backups, db.events, db.outbox], async (tx) => {
      const existing = await backupRepository.listByOwner(LOCAL_OWNER_ID);
      const previousRemote = existing.find(
        (row) => row.kind === 'remote' && row.remoteKey !== null,
      );
      const id = deps.ids.ulid(now);
      const row: Backup = {
        id,
        ownerId: LOCAL_OWNER_ID,
        kind: 'remote',
        createdAt: now,
        branchCount: snapshot.value.branchCount,
        taskCount: snapshot.value.taskCount,
        commitCount: snapshot.value.commitCount,
        schemaVersion: snapshot.value.schemaVersion,
        bytes: snapshot.value.bytes,
        restoredAt: null,
        remoteKey: uploaded.value.remoteKey,
        payload: '',
      };

      await backupRepository.create(row);
      await writeEvent(tx, 'backup.create', id, { backupId: id, kind: 'remote' }, deps);

      const expired = selectExpiredBackupIds([...existing, row]);
      if (expired.length > 0) await backupRepository.remove(expired);

      if (previousRemote?.remoteKey) {
        await deleteRemotePackage(previousRemote.remoteKey);
      }

      return ok(row);
    });
    if (result.ok) {
      trackOpsEvent('backup.upload', { result: 'success', bytes: result.value.bytes });
    } else {
      trackOpsEvent('backup.upload', { result: 'failed', errorCode: result.error.code });
    }
    return result;
  } catch (cause) {
    // 本地元数据写失败时清理刚上传的文件，避免远端留下无人引用的半份记录。
    await deleteRemotePackage(uploaded.value.remoteKey);
    trackOpsEvent('backup.upload', { result: 'failed', errorCode: 'storage.write_failed' });
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
