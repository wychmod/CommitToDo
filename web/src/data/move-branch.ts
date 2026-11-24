import { fail, ok, type Result } from '@/core/errors';
import { assessMove } from '@/core/rules/branch-hierarchy';
import { validateBranchTitle } from '@/core/rules/branch-name';
import { collectSubtree, childPath, depthFromPath, movedPath } from '@/core/rules/branch-path';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { enqueueEntityWrite } from './outbox';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface MoveBranchInput {
  branchId: string;
  targetParentId: string;
}

/**
 * 移动分支（PRD B05 / R16）。
 *
 * 只能移到自己的父分支，不可移到自身或后代下，移动后整棵子树不得超过 3 层；
 * 移到同一父分支下是空操作。成功后子树逐行改写 `path` 与 `depth`，只记一条
 * `branch.move`（含 `movedCount`），任一子节点写失败整体回滚。
 */
export async function moveBranch(
  input: MoveBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction('rw', [db.branches, db.events, db.outbox], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const subject = live.find((branch) => branch.id === input.branchId);
      const target = live.find((branch) => branch.id === input.targetParentId);

      if (!subject) {
        return fail('domain.not_found', { field: 'branchId' });
      }
      if (subject.depth === 0) {
        return fail('domain.readonly_branch', { field: 'branchId' });
      }
      if (subject.archivedAt !== null || subject.status !== 'active') {
        return fail('domain.readonly_branch', { field: 'branchId' });
      }
      if (!target) {
        return fail('domain.not_found', { field: 'parentId' });
      }
      if (target.archivedAt !== null || target.status !== 'active') {
        return fail('domain.readonly_branch', { field: 'parentId' });
      }
      if (target.id === subject.parentId) {
        return ok(subject);
      }

      const subtree = collectSubtree(live, subject.path);
      const subtreeMaxDepth = subtree.reduce(
        (max, branch) => Math.max(max, branch.depth),
        subject.depth,
      );
      const assessment = assessMove(subject, subtreeMaxDepth, target);
      if (!assessment.allowed) {
        if (assessment.reason === 'too-deep') {
          return fail('domain.quota_exceeded', { field: 'parentId' });
        }
        if (assessment.reason === 'root') {
          return fail('domain.readonly_branch', { field: 'branchId' });
        }
        return fail('validation.invalid_input', { field: 'parentId' });
      }

      const targetSiblings = live.filter((branch) => branch.parentId === target.id);
      const name = validateBranchTitle({
        title: subject.title,
        siblings: targetSiblings,
        selfId: subject.id,
      });
      if (name.reason === 'duplicate') {
        return fail('domain.conflict', { field: 'title' });
      }

      const at = deps.clock.now();
      const subjectPath = childPath(target.path, subject.id);
      let moved: Branch | null = null;

      for (const branch of subtree) {
        const path =
          branch.id === subject.id
            ? subjectPath
            : movedPath(branch.path, subject.path, subjectPath);
        const next: Branch = {
          ...branch,
          path,
          depth: depthFromPath(path),
          parentId: branch.id === subject.id ? target.id : branch.parentId,
          rev: branch.rev + 1,
          updatedAt: at,
        };
        await branchRepository.put(next);
        // 子树逐行 rev+1，但只写一条 event；其余行必须单独入队，否则同步基线错位。
        if (branch.id !== subject.id) {
          await enqueueEntityWrite(
            tx,
            'branch',
            branch.id,
            'branch.move',
            { branchId: branch.id, parentId: next.parentId ?? '' },
            deps,
          );
        }
        if (branch.id === subject.id) moved = next;
      }

      await writeEvent(
        tx,
        'branch.move',
        subject.id,
        {
          branchId: subject.id,
          fromParentId: subject.parentId ?? '',
          toParentId: target.id,
          movedCount: subtree.length,
        },
        deps,
      );

      return ok(moved ?? subject);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
