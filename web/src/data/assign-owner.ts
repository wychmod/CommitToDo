import { fail, ok, type Result } from '@/core/errors';
import { db, LOCAL_OWNER_ID, setOwnerId } from './db';

/**
 * 登录后把本机数据归属到账号（PRD V2-01 OP-08）。
 *
 * 只改 `ownerId`：条数、四计数、统计与徽章都不变，也不写业务事件。
 * 全部表在同一事务里改完才切换当前归属，任一步失败都保持 `local` 不变。
 */
export async function assignOwnerTo(principalId: string): Promise<Result<{ moved: number }>> {
  if (principalId.length === 0) {
    return fail('validation.invalid_input', { field: 'principalId' });
  }

  const from = LOCAL_OWNER_ID;
  if (from === principalId) return ok({ moved: 0 });

  try {
    const moved = await db.transaction(
      'rw',
      [
        db.branches,
        db.tasks,
        db.commits,
        db.milestones,
        db.badges,
        db.settings,
        db.events,
        db.backups,
        db.yearReviews,
      ],
      async () => {
        let count = 0;

        const branches = await db.branches.where('ownerId').equals(from).toArray();
        await db.branches.bulkPut(branches.map((row) => ({ ...row, ownerId: principalId })));
        count += branches.length;

        const tasks = await db.tasks.where('ownerId').equals(from).toArray();
        await db.tasks.bulkPut(tasks.map((row) => ({ ...row, ownerId: principalId })));
        count += tasks.length;

        const commits = await db.commits.where('ownerId').equals(from).toArray();
        await db.commits.bulkPut(commits.map((row) => ({ ...row, ownerId: principalId })));
        count += commits.length;

        const milestones = await db.milestones.where('ownerId').equals(from).toArray();
        await db.milestones.bulkPut(milestones.map((row) => ({ ...row, ownerId: principalId })));
        count += milestones.length;

        const badges = await db.badges.where('ownerId').equals(from).toArray();
        await db.badges.bulkPut(badges.map((row) => ({ ...row, ownerId: principalId })));
        count += badges.length;

        const settings = await db.settings.where('ownerId').equals(from).toArray();
        await db.settings.bulkPut(settings.map((row) => ({ ...row, ownerId: principalId })));
        count += settings.length;

        const events = await db.events.where('ownerId').equals(from).toArray();
        await db.events.bulkPut(events.map((row) => ({ ...row, ownerId: principalId })));
        count += events.length;

        const backups = await db.backups.where('ownerId').equals(from).toArray();
        await db.backups.bulkPut(backups.map((row) => ({ ...row, ownerId: principalId })));
        count += backups.length;

        const reviews = await db.yearReviews.where('ownerId').equals(from).toArray();
        await db.yearReviews.bulkPut(reviews.map((row) => ({ ...row, ownerId: principalId })));
        count += reviews.length;

        return count;
      },
    );

    setOwnerId(principalId);
    return ok({ moved });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
