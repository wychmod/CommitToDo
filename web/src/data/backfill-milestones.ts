import { toLocalDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { validateBackfill } from '@/core/rules/backfill';
import { normalizeMilestoneAchievedAt } from '@/core/rules/milestone-date';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { grantBadge } from './grant-badge';
import { branchRepository, milestoneRepository } from './repositories';
import type { Milestone } from './types';

export interface BackfillRowInput {
  title: string;
  /** `YYYY-MM`。 */
  month: string;
  branchId: string;
}

export interface BackfillOutput {
  milestones: Milestone[];
  /** 最早的一条，供保存后回到历程定位；同月按创建顺序取先写入的。 */
  earliest: Milestone | null;
}

/**
 * 回填过去（PRD V1-07 A-04 / OP-06）。
 *
 * 每条生成一条 `datePrecision=month` 里程碑，`achievedAt` 落在所选年月；
 * 不生成提交、不写待办、不改四计数。整批同一事务，任一条失败全部回滚。
 * 「补白」徽章在事务提交后按 R18 幂等补发。
 */
export async function backfillMilestones(
  input: { rows: BackfillRowInput[] },
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<BackfillOutput>> {
  try {
    const result = await db.transaction(
      'rw',
      [db.branches, db.milestones, db.events, db.outbox],
      async (tx) => {
        const at = deps.clock.now();
        const tzOffset = deps.tzOffset(at);
        const todayDate = toLocalDate(at, tzOffset);
        const branches = (await branchRepository.listByOwner(LOCAL_OWNER_ID)).filter(
          (branch) => branch.deletedAt === null,
        );

        const validation = validateBackfill(input.rows, branches, todayDate);
        const first = validation.issues[0];
        if (first) {
          if (first.field === 'title') {
            return fail('validation.title_empty', { field: 'title' });
          }
          if (first.field === 'branch') {
            return fail(
              first.reason === 'missing' ? 'domain.not_found' : 'domain.readonly_branch',
              { field: 'branchId' },
            );
          }
          return fail('validation.invalid_input', {
            field: first.field === 'rows' ? 'rows' : 'month',
            retriable: false,
          });
        }
        if (validation.entries.length === 0) {
          return fail('validation.invalid_input', { field: 'rows', retriable: false });
        }

        const created: Milestone[] = [];
        for (const entry of validation.entries) {
          const id = deps.ids.ulid(at);
          const row: Milestone = {
            id,
            ownerId: LOCAL_OWNER_ID,
            branchId: entry.branchId,
            title: entry.title,
            note: null,
            achievedAt: normalizeMilestoneAchievedAt(entry.date, 'month', tzOffset),
            datePrecision: 'month',
            rev: 1,
            createdAt: at,
            updatedAt: at,
            deletedAt: null,
          };
          await milestoneRepository.create(row);
          await writeEvent(
            tx,
            'milestone.create',
            id,
            { milestoneId: id, branchId: entry.branchId, source: 'backfill' },
            deps,
          );
          created.push(row);
        }

        const earliest =
          created
            .slice()
            .sort(
              (left, right) =>
                left.achievedAt - right.achievedAt || left.id.localeCompare(right.id),
            )[0] ?? null;

        return ok({ milestones: created, earliest });
      },
    );
    // 徽章发放失败不回滚主操作；补白由第一条过去里程碑触发。
    if (result.ok) await grantBadge(deps);
    return result;
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
