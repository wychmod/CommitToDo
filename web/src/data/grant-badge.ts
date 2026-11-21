import { fail, ok, type Result } from '@/core/errors';
import { assessBadges, BADGE_PERIOD_ONCE } from '@/core/rules/badges';
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
 * 首批徽章发放与补查（PRD M11 OP-01–OP-03 / R18）。
 *
 * 独立事务，绝不并入触发动作的事务：徽章写入失败时主操作照常成功，
 * 下次启动或进入「我的」时再补查。`catalogId + periodKey` 唯一索引与先读后写
 * 一起保证每枚只发一次；已存在时不改写 `grantedAt` 与 `snapshot`。
 */
export async function grantBadge(deps: WriteDeps = defaultWriteDeps): Promise<Result<Badge[]>> {
  try {
    return await db.transaction(
      'rw',
      [db.badges, db.branches, db.commits, db.milestones, db.events],
      async (tx) => {
        const [branches, commits, milestones, existing] = await Promise.all([
          branchRepository.listByOwner(LOCAL_OWNER_ID),
          commitRepository.listByOwner(LOCAL_OWNER_ID),
          milestoneRepository.listByOwner(LOCAL_OWNER_ID),
          badgeRepository.listByOwner(LOCAL_OWNER_ID),
        ]);

        const candidates = assessBadges({ branches, commits, milestones });
        const at = deps.clock.now();
        const granted: Badge[] = [];

        for (const candidate of candidates) {
          const already = existing.some(
            (badge) =>
              badge.catalogId === candidate.catalogId && badge.periodKey === BADGE_PERIOD_ONCE,
          );
          if (already) continue;

          const row: Badge = {
            id: deps.ids.ulid(at),
            ownerId: LOCAL_OWNER_ID,
            catalogId: candidate.catalogId,
            category: candidate.category,
            periodKey: BADGE_PERIOD_ONCE,
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
