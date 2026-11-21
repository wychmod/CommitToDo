import { fail, ok, type Result } from '@/core/errors';
import { BADGE_PERIOD_ALL } from '@/core/rules/badge-catalog';
import { selectNewBadges, type GrantSelectOptions } from '@/core/rules/badge-grant';
import { assessBadges } from '@/core/rules/badges';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import {
  badgeRepository,
  branchRepository,
  commitRepository,
  milestoneRepository,
} from './repositories';
import type { Badge } from './types';

/**
 * 徽章发放与补查（PRD V1-05 OP-02–OP-05 / R18）。
 *
 * 独立事务，绝不并入触发动作的事务：徽章写入失败时主操作照常成功，
 * 下次启动或进入「我的」时再补查。同一 `catalogId` 只发一次，旧标识
 * `first-branch` 归一到 `first-fork` 后比较，已发放的快照不被改写。
 */
export async function grantBadge(
  deps: WriteDeps = defaultWriteDeps,
  options: GrantSelectOptions = {},
): Promise<Result<Badge[]>> {
  try {
    return await db.transaction(
      'rw',
      [db.badges, db.branches, db.commits, db.milestones, db.events, db.outbox],
      async (tx) => {
        const [branches, commits, milestones, existing] = await Promise.all([
          branchRepository.listByOwner(LOCAL_OWNER_ID),
          commitRepository.listByOwner(LOCAL_OWNER_ID),
          milestoneRepository.listByOwner(LOCAL_OWNER_ID),
          badgeRepository.listByOwner(LOCAL_OWNER_ID),
        ]);

        const at = deps.clock.now();
        const assessment = assessBadges({ branches, commits, milestones }, at, deps.tzOffset(at));
        const candidates = selectNewBadges(assessment.candidates, existing, options);
        const granted: Badge[] = [];

        for (const candidate of candidates) {
          const row: Badge = {
            id: deps.ids.ulid(at),
            ownerId: LOCAL_OWNER_ID,
            catalogId: candidate.catalogId,
            category: candidate.category,
            periodKey: BADGE_PERIOD_ALL,
            grantedAt: at,
            snapshot: candidate.snapshot,
            sourceEntityId: candidate.sourceEntityId,
            rev: 1,
            createdAt: at,
          };
          await badgeRepository.create(row);
          await writeEvent(
            tx,
            'badge.grant',
            row.id,
            { badgeId: row.id, catalogId: row.catalogId, periodKey: row.periodKey },
            deps,
          );
          granted.push(row);
        }

        return ok(granted);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
