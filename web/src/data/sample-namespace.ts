import { fail, ok, type Result } from '@/core/errors';
import { buildSampleTree, SAMPLE_OWNER_ID } from '@/core/rules/sample-tree';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';

export interface SampleLoadResult {
  branches: number;
  commits: number;
  milestones: number;
}

/**
 * 示例命名空间的载入与清除（PRD M12 OP-05–OP-07）。
 *
 * 示例记录写进与真实表相同的表结构，但 `ownerId = 'example'` 且 id 带
 * `example:` 前缀，因此真实读路径（按 `local` 过滤）与导出（过滤示例）都看不到。
 * 载入先清掉旧示例再写入，同一事务内失败整体回滚；删除为物理清除且不写 `events`。
 */
export async function loadSampleTree(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<SampleLoadResult>> {
  const now = deps.clock.now();
  const tree = buildSampleTree(now, deps.tzOffset(now));

  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.milestones],
      async () => {
        await Promise.all([
          db.branches.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
          db.tasks.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
          db.commits.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
          db.milestones.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
        ]);

        await db.branches.bulkPut(tree.branches);
        await db.commits.bulkPut(tree.commits);
        await db.milestones.bulkPut(tree.milestones);

        return ok({
          branches: tree.branches.length,
          commits: tree.commits.length,
          milestones: tree.milestones.length,
        });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

/** 删除示例只清示例命名空间；真实数据逐行不变，不写 `events`。 */
export async function clearSampleTree(): Promise<Result<true>> {
  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.milestones],
      async () => {
        await Promise.all([
          db.branches.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
          db.tasks.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
          db.commits.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
          db.milestones.where('ownerId').equals(SAMPLE_OWNER_ID).delete(),
        ]);
        return ok(true);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
