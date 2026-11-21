import { fail, ok, type Result } from '@/core/errors';
import { inheritedBranchColor, normalizeBranchColor } from '@/core/rules/branch-color';
import { canCreateChild } from '@/core/rules/branch-hierarchy';
import { validateBranchTitle } from '@/core/rules/branch-name';
import { childPath } from '@/core/rules/branch-path';
import { assessCreateQuota } from '@/core/rules/branch-quota';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface CreateBranchInput {
  title: string;
  /** 新分支的父分支；建一级分支时传根分支 id。 */
  parentId: string;
  /** 仅一级分支可选色相；子分支继承父色相，传值也会被父色覆盖。 */
  color?: string;
}

/**
 * 新建一级或子分支（PRD B02 / B03）。
 *
 * 事务内同时校验层级、同级重名、名额与父分支只读状态，写入分支后记一条
 * `branch.create`。任一校验失败都不写任何行。
 */
export async function createBranch(
  input: CreateBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  const emptyName = validateBranchTitle({ title: input.title, siblings: [] });
  if (!emptyName.ok) {
    return fail('validation.title_empty', { field: 'title' });
  }

  try {
    return await db.transaction('rw', [db.branches, db.events], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const parent = live.find((branch) => branch.id === input.parentId);

      if (!parent) {
        return fail('domain.not_found', { field: 'parentId' });
      }
      if (parent.archivedAt !== null || parent.status !== 'active') {
        return fail('domain.readonly_branch', { field: 'parentId' });
      }
      if (!canCreateChild(parent.depth)) {
        return fail('domain.quota_exceeded', { field: 'parentId' });
      }

      const siblings = live.filter((branch) => branch.parentId === parent.id);
      const name = validateBranchTitle({ title: input.title, siblings });
      if (name.reason === 'duplicate') {
        return fail('domain.conflict', { field: 'title' });
      }

      const quota = assessCreateQuota(parent.id, parent.depth, live);
      if (!quota.allowed) {
        return fail('domain.quota_exceeded', { field: 'parentId' });
      }

      const at = deps.clock.now();
      const id = deps.ids.ulid(at);
      const order = siblings.reduce((max, branch) => Math.max(max, branch.order), 0) + 1;
      const color =
        parent.depth === 0 && input.color !== undefined
          ? normalizeBranchColor(input.color)
          : inheritedBranchColor(parent.color);

      const row: Branch = {
        id,
        ownerId: LOCAL_OWNER_ID,
        parentId: parent.id,
        path: childPath(parent.path, id),
        depth: parent.depth + 1,
        title: name.title,
        goal: null,
        color,
        status: 'active',
        order,
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
      await writeEvent(tx, 'branch.create', id, { branchId: id, parentId: parent.id }, deps);

      return ok(row);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
