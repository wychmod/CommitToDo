import { toLocalDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { normalizeMilestoneAchievedAt, type MilestonePrecision } from '@/core/rules/milestone-date';
import {
  defaultMilestoneBranchId,
  milestoneTargetReason,
  validateMilestoneDraft,
} from '@/core/rules/milestone-target';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { grantBadge } from './grant-badge';
import { branchRepository, milestoneRepository } from './repositories';
import { trackOpsEvent } from './ops-events';
import type { Milestone } from './types';

export type CreateMilestonePrecision = 'day' | 'month';

export interface CreateMilestoneInput {
  title: string;
  /** 月精度传当月 1 日（`YYYY-MM-01`）。 */
  date: string;
  precision: CreateMilestonePrecision;
  branchId?: string | null;
  note?: string | null;
}

export interface CreateMilestoneOutput {
  milestone: Milestone;
  branchId: string;
}

/**
 * 新建里程碑（M07 OP-01）。
 *
 * 只写 `milestones` 与一条 `milestone.create` 事件，不触碰四计数；
 * 根分支始终可选，已归档、已合并、已放下分支拒绝写入。
 */
export async function createMilestone(
  input: CreateMilestoneInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<CreateMilestoneOutput>> {
  try {
    const result = await db.transaction(
      'rw',
      [db.branches, db.milestones, db.events, db.outbox],
      async (tx) => {
        const at = deps.clock.now();
        const tzOffset = deps.tzOffset(at);
        const todayDate = toLocalDate(at, tzOffset);

        const issues = validateMilestoneDraft({
          title: input.title,
          date: input.date,
          precision: input.precision,
          todayDate,
        });
        const titleIssue = issues.find((issue) => issue.field === 'title');
        if (titleIssue) return fail('validation.title_empty', { field: 'title' });
        const dateIssue = issues.find((issue) => issue.field === 'date');
        if (dateIssue) {
          return fail('validation.invalid_input', {
            field: 'date',
            retriable: false,
          });
        }

        const branches = (await branchRepository.listByOwner(LOCAL_OWNER_ID)).filter(
          (branch) => branch.deletedAt === null,
        );

        let branchId: string | null = null;
        if (input.branchId) {
          const preferred = branches.find((branch) => branch.id === input.branchId);
          if (!preferred) return fail('domain.not_found', { field: 'branchId' });
          if (milestoneTargetReason(preferred) !== null) {
            return fail('domain.readonly_branch', { field: 'branchId' });
          }
          branchId = preferred.id;
        } else {
          branchId = defaultMilestoneBranchId(branches, null);
        }
        if (branchId === null) {
          return fail('domain.not_found', { field: 'branchId' });
        }
        const target = branches.find((branch) => branch.id === branchId);
        if (!target) return fail('domain.not_found', { field: 'branchId' });

        const id = deps.ids.ulid(at);
        const row: Milestone = {
          id,
          ownerId: LOCAL_OWNER_ID,
          branchId,
          title: input.title.trim(),
          note: input.note?.trim() ? input.note.trim() : null,
          achievedAt: normalizeMilestoneAchievedAt(
            input.date,
            input.precision as MilestonePrecision,
            tzOffset,
          ),
          datePrecision: input.precision,
          rev: 1,
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
        };

        await milestoneRepository.create(row);
        await writeEvent(tx, 'milestone.create', id, { milestoneId: id, branchId }, deps);

        return ok({ milestone: row, branchId });
      },
    );
    // 徽章发放失败不回滚主操作。
    if (result.ok) await grantBadge(deps);
    if (result.ok) trackOpsEvent('milestone.create', { precision: input.precision });
    return result;
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
