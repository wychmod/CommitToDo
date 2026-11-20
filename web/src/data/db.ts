import Dexie, { type EntityTable } from 'dexie';
import type { Badge, Branch, Commit, EventRecord, Milestone, Settings, Task } from './types';

/**
 * 本机权威库（TECH-ARCHITECTURE.md §5.3）。
 *
 * MVP 只有这 7 张业务表；`users` / `outbox` / `conflicts` / `migration_state` /
 * `backups` / `year_reviews` 等留到 V1、V2，需要时再加版本号升级。
 * 索引改动必须同步 §5.3.2 的查询清单，不允许为临时查询随手加索引。
 */
export class CommitToDoDatabase extends Dexie {
  branches!: EntityTable<Branch, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  commits!: EntityTable<Commit, 'id'>;
  milestones!: EntityTable<Milestone, 'id'>;
  badges!: EntityTable<Badge, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  events!: EntityTable<EventRecord, 'id'>;

  constructor() {
    super('committodo');

    this.version(1).stores({
      branches:
        'id, ownerId, parentId, path, depth, status, archivedAt, pinnedAt, ' +
        '[ownerId+parentId], [ownerId+status], [ownerId+archivedAt], [ownerId+updatedAt]',
      tasks:
        'id, ownerId, branchId, status, dueDate, plannedDate, completedAt, ' +
        '[ownerId+branchId], [ownerId+status], [ownerId+status+dueDate], ' +
        '[ownerId+status+plannedDate], [ownerId+completedAt]',
      commits:
        'id, ownerId, branchId, sourceBranchId, taskId, date, at, ' +
        '[ownerId+date], [ownerId+branchId+date], [ownerId+branchId+at]',
      milestones:
        'id, ownerId, branchId, achievedAt, ' + '[ownerId+achievedAt], [ownerId+branchId]',
      badges:
        'id, ownerId, catalogId, category, periodKey, grantedAt, ' +
        '[ownerId+grantedAt], [ownerId+category], &[ownerId+catalogId+periodKey]',
      settings: 'id, ownerId, updatedAt',
      events: 'id, ownerId, entityId, at, [ownerId+at], [entityId+at]',
    });
  }
}

export const db = new CommitToDoDatabase();

/** MVP 只有本机一个 owner；V2 接入账号后由会话提供。 */
export const LOCAL_OWNER_ID = 'local';
