import { fail, ok, type ErrorCode, type Result } from '@/core/errors';
import {
  assessPause,
  normalizeDropReason,
  type PauseBlockReason,
} from '@/core/rules/branch-lifecycle';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository } from './repositories';
import { grantBadge } from './grant-badge';
import type { Branch } from './types';

export interface PauseBranchInput {
  branchId: string;
  reason: string;
}

export function lifecycleErrorCode(reason: string): ErrorCode {
  if (reason === 'deleted') return 'domain.not_found';
  if (reason === 'active-descendants') return 'domain.conflict';
  return 'domain.readonly_branch';
}

function pauseFailure(reason: PauseBlockReason): Result<never> {
  return fail(lifecycleErrorCode(reason), { field: 'branchId' });
}

/**
 * 放下分支（V1-01 OP-01 / R15）。
 *
 * 只把 `status` 改为 `dropped` 并写 `droppedAt` / `dropReason`：
 * 待办不改归属，由 R8 在读路径把它们移出今天；后代状态不受影响。
 * 与 `branch.pause` 事件同事务，失败整体回滚。
 */
export async function pauseBranch(
  input: PauseBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    const result = await db.transaction('rw', [db.branches, db.events, db.outbox], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const subject = live.find((branch) => branch.id === input.branchId);
      if (!subject) return fail('domain.not_found', { field: 'branchId' });

      const reason = normalizeDropReason(input.reason);
      if (!reason) return fail('validation.invalid_input', { field: 'reason' });

      const assessment = assessPause(subject, new Map(live.map((row) => [row.id, row])));
      if (!assessment.allowed) return pauseFailure(assessment.reason ?? 'archived');

      const at = deps.clock.now();
      const next: Branch = {
        ...subject,
        status: 'dropped',
        droppedAt: at,
        dropReason: reason,
        rev: subject.rev + 1,
        updatedAt: at,
      };
      await branchRepository.put(next);
      await writeEvent(tx, 'branch.pause', subject.id, { branchId: subject.id, reason }, deps);
      return ok(next);
    });
    // 徽章发放失败不回滚主操作。
    if (result.ok) await grantBadge(deps);
    return result;
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
