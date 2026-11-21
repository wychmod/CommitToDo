import { fail, ok, type Result } from '@/core/errors';
import { recountBranch } from '@/core/rules/counters';
import { validateImportFile, type ImportSummary } from '@/core/rules/import-validate';
import type { ExportCounts } from '@/core/rules/export-file';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import type { Badge, Branch, Commit, EventRecord, Milestone, Settings, Task } from './types';

export interface ImportDataInput {
  text: string;
}

export interface ImportDataResult {
  counts: ExportCounts;
  summary: ImportSummary;
}

/**
 * 从文件整体替换（PRD M10 OP-05 / OP-07）。
 *
 * 先做纯函数校验，不写库；校验通过后单事务内清空七张表再写入文件数据：
 * 分支四计数按文件内的待办与有效提交全量重算（R7），已撤销提交保留 `voidedAt`（R3）。
 * 任一步失败整体回滚，导入前的数据完整保留。
 */
export async function importData(
  input: ImportDataInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<ImportDataResult>> {
  const parsed = validateImportFile(input.text);
  if (!parsed.ok) return parsed;

  const { tables, summary } = parsed.value;

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
        db.outbox,
      ],
      async (tx) => {
        await Promise.all([
          db.branches.clear(),
          db.tasks.clear(),
          db.commits.clear(),
          db.milestones.clear(),
          db.badges.clear(),
          db.settings.clear(),
          db.events.clear(),
        ]);

        const tasks = tables.tasks as unknown as Task[];
        const commits = tables.commits as unknown as Commit[];
        const branches = (tables.branches as unknown as Branch[]).map((branch) => ({
          ...branch,
          ...recountBranch(branch.id, tasks, commits),
        }));

        await db.branches.bulkPut(branches);
        await db.tasks.bulkPut(tasks);
        await db.commits.bulkPut(commits);
        await db.milestones.bulkPut(tables.milestones as unknown as Milestone[]);
        await db.badges.bulkPut(tables.badges as unknown as Badge[]);
        await db.settings.bulkPut(tables.settings as unknown as Settings[]);
        await db.events.bulkPut(tables.events as unknown as EventRecord[]);

        await writeEvent(
          tx,
          'data.import',
          LOCAL_OWNER_ID,
          { counts: summary.counts, schemaVersion: summary.schemaVersion },
          deps,
        );

        return ok({ counts: summary.counts, summary });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
