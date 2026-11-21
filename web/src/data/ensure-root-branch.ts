import { fail, ok, type Result } from '@/core/errors';
import { DEFAULT_BRANCH_COLOR } from '@/core/rules/branch-color';
import { ROOT_PATH } from '@/core/rules/branch-path';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository } from './repositories';
import type { Branch } from './types';

/**
 * 首次进入工作区时创建根分支「我」（PRD M02 OP-01）。
 *
 * 根不计入「新开」统计，也不受层级与名额限制；已存在时直接返回原行。
 * 调用方可以重复调用（StrictMode 与多次导航都安全）。
 */

const ROOT_BRANCH_TITLE = '我';

export async function ensureRootBranch(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction('rw', [db.branches, db.events], async (tx) => {
      const branches = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const existing = branches.find((branch) => branch.depth === 0 && branch.deletedAt === null);
      if (existing) return ok(existing);

      const at = deps.clock.now();
      const id = deps.ids.ulid(at);
      const row: Branch = {
        id,
        ownerId: LOCAL_OWNER_ID,
        parentId: null,
        path: ROOT_PATH,
        depth: 0,
        title: ROOT_BRANCH_TITLE,
        goal: null,
        color: DEFAULT_BRANCH_COLOR,
        status: 'active',
        order: 0,
        archivedAt: null,
        finishedAt: null,
        finishedIntoId: null,
        droppedAt: null,
        dropReason: null,
        pinnedAt: null,
        taskTotal: 0,
        taskDone: 0,
        commitCount: 0,
        ownLastCommitAt: null,
        rev: 1,
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
      };

      await branchRepository.create(row);
      await writeEvent(tx, 'branch.create', id, { branchId: id, parentId: null }, deps);

      return ok(row);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
