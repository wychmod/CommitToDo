import { fail, ok, type Result } from '@/core/errors';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessDelete } from '@/core/rules/delete-guard';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import {
  branchRepository,
  commitRepository,
  eventRepository,
  milestoneRepository,
  taskRepository,
} from './repositories';

export interface DeleteEmptyBranchInput {
  branchId: string;
}

export interface DeleteEmptyBranchResult {
  branchId: string;
  /** 删除后的回退目标：父分支；根分支不会进入这里。 */
  parentId: string | null;
}

/**
 * 删除空分支（PRD M08 OP-06，R13）。
 *
 * 先校验整棵子树没有待办、提交、里程碑、子分支与收尾/放下/纠错痕迹；
 * 通过后在同一事务内物理删除，不写 `events`、不写 `deletedAt`、不产生徽章。
 * 根分支恒不可删；写入失败返回 `storage.write_failed`，分支保持原样。
 */
export async function deleteEmptyBranch(
  input: DeleteEmptyBranchInput,
  _deps: WriteDeps = defaultWriteDeps,
): Promise<Result<DeleteEmptyBranchResult>> {
  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.milestones, db.events],
      async () => {
        const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
        const live = all.filter((branch) => branch.deletedAt === null);
        const subject = live.find((branch) => branch.id === input.branchId);
        if (!subject) return fail('domain.not_found', { field: 'branchId' });

        const subtree = collectSubtree(live, subject.path);
        const [tasks, commits, milestones, events] = await Promise.all([
          taskRepository.listByOwner(LOCAL_OWNER_ID),
          commitRepository.listByOwner(LOCAL_OWNER_ID),
          milestoneRepository.listByOwner(LOCAL_OWNER_ID),
          eventRepository.listRecent(LOCAL_OWNER_ID, Number.MAX_SAFE_INTEGER),
        ]);

        const guard = assessDelete({ subject, subtree, tasks, commits, milestones, events });
        if (!guard.allowed) {
          const code = guard.reasons.includes('root')
            ? 'domain.readonly_branch'
            : 'domain.conflict';
          return fail(code, { field: 'branchId' });
        }

        await branchRepository.remove(guard.subtreeIds);
        return ok({ branchId: subject.id, parentId: subject.parentId });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
