import { toIsoString, toLocalDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import {
  buildExportFile,
  type ExportCounts,
  type ExportFilePayload,
  type ExportRecord,
} from '@/core/rules/export-file';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import {
  badgeRepository,
  branchRepository,
  commitRepository,
  eventRepository,
  milestoneRepository,
  settingsRepository,
  taskRepository,
} from './repositories';

export interface ExportDataResult {
  fileName: string;
  /** 可直接下载的 JSON 文本，缩进两格便于用户阅读。 */
  text: string;
  payload: ExportFilePayload<ExportRecord>;
  counts: ExportCounts;
  exportedAt: string;
}

/**
 * 导出完整数据（PRD M10 OP-01）。
 *
 * 只读业务表，同一事务内取七个表的快照并写一条 `data.export` 事件；
 * 示例命名空间的行在组装时剔除。读失败按 `storage.write_failed` 返回，
 * 不生成半份文件。
 */
export async function exportData(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<ExportDataResult>> {
  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.milestones, db.badges, db.settings, db.events],
      async (tx) => {
        const [branches, tasks, commits, milestones, badges, settings, events] = await Promise.all([
          branchRepository.listByOwner(LOCAL_OWNER_ID),
          taskRepository.listByOwner(LOCAL_OWNER_ID),
          commitRepository.listByOwner(LOCAL_OWNER_ID),
          milestoneRepository.listByOwner(LOCAL_OWNER_ID),
          badgeRepository.listByOwner(LOCAL_OWNER_ID),
          settingsRepository.listByOwner(LOCAL_OWNER_ID),
          eventRepository.listRecent(LOCAL_OWNER_ID, Number.MAX_SAFE_INTEGER),
        ]);

        const now = deps.clock.now();
        const file = buildExportFile<ExportRecord>({
          exportedAt: toIsoString(now),
          localDate: toLocalDate(now, deps.tzOffset(now)),
          branches,
          tasks,
          commits,
          milestones,
          badges,
          settings,
          events,
        });

        await writeEvent(tx, 'data.export', LOCAL_OWNER_ID, { counts: file.counts }, deps);

        return ok({
          fileName: file.fileName,
          text: JSON.stringify(file.payload, null, 2),
          payload: file.payload,
          counts: file.counts,
          exportedAt: file.payload.exportedAt,
        });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
