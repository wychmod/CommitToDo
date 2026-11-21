import { toLocalDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { selectExpiredBackupIds } from '@/core/rules/backup-retention';
import { backupRowFromSnapshot, buildBackupSnapshot } from './backup-snapshot';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { backupRepository, settingsRepository } from './repositories';
import { DEFAULT_SETTINGS, SETTINGS_ID } from './settings-defaults';
import type { Settings } from './types';

export interface DailyAutoBackupResult {
  created: boolean;
  backupId: string | null;
}

/**
 * 每日自动快照（PRD V1-06 OP-01 / R17）。
 *
 * 每次打开工作区最多写一条 `kind=auto`；按操作当时的本地自然日判断，
 * 当日已有自动快照则跳过。写入失败只返回 `Result`，由外壳忽略，
 * 不阻断进入工作区。自动快照超限时只淘汰最旧的自动快照。
 */
export async function runDailyAutoBackup(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<DailyAutoBackupResult>> {
  try {
    return await db.transaction(
      'rw',
      [
        db.branches,
        db.tasks,
        db.commits,
        db.milestones,
        db.badges,
        db.settings,
        db.events,
        db.backups,
        db.outbox,
      ],
      async (tx) => {
        const now = deps.clock.now();
        const tzOffset = deps.tzOffset(now);
        const day = toLocalDate(now, tzOffset);
        const existing = await backupRepository.listByOwner(LOCAL_OWNER_ID);
        const hasTodayAuto = existing.some(
          (row) => row.kind === 'auto' && toLocalDate(row.createdAt, tzOffset) === day,
        );
        if (hasTodayAuto) return ok({ created: false, backupId: null });

        const snapshot = await buildBackupSnapshot(now, tzOffset);
        const id = deps.ids.ulid(now);
        const row = backupRowFromSnapshot(id, 'auto', now, snapshot);
        await backupRepository.create(row);

        const current = await settingsRepository.getById(SETTINGS_ID);
        const settings: Settings = {
          ...DEFAULT_SETTINGS,
          ...current,
          id: SETTINGS_ID,
          ownerId: LOCAL_OWNER_ID,
          lastAutoBackupAt: now,
          rev: (current?.rev ?? 0) + 1,
          updatedAt: now,
        };
        await settingsRepository.put(settings);

        await writeEvent(tx, 'backup.create', id, { backupId: id, kind: 'auto' }, deps);

        const expired = selectExpiredBackupIds([...existing, row]);
        if (expired.length > 0) await backupRepository.remove(expired);

        return ok({ created: true, backupId: id });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
