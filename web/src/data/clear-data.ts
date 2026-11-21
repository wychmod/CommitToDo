import { fail, ok, type Result } from '@/core/errors';
import { EXPORT_TABLES, type ExportCounts } from '@/core/rules/export-file';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';

/**
 * 清空本机数据（PRD M10 OP-06）。
 *
 * 单事务内清空七张业务表（含示例命名空间，因为示例也在这七张表里），
 * V1-06 起一并清除本机快照与异地备份的本机元数据（远端文件由用户单独删除）；
 * 清空后写一条 `data.clear` 事件保留「清过库」的痕迹；任一步失败整体回滚。
 */
export async function clearAllData(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<ExportCounts>> {
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
      ],
      async (tx) => {
        const counts = {} as ExportCounts;
        for (const table of EXPORT_TABLES) {
          counts[table] = await db.table(table).count();
        }

        await Promise.all([
          db.branches.clear(),
          db.tasks.clear(),
          db.commits.clear(),
          db.milestones.clear(),
          db.badges.clear(),
          db.settings.clear(),
          db.events.clear(),
          db.backups.clear(),
        ]);

        await writeEvent(tx, 'data.clear', LOCAL_OWNER_ID, { counts }, deps);
        return ok(counts);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
