import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  Badge,
  Branch,
  Commit,
  EventRecord,
  Milestone,
  Settings,
  Task,
  YearReview,
} from './types';

/** 当前库版本；只有增删表、索引或主键才 bump（CODE-STRUCTURE §5）。 */
export const DB_VERSION = 2;

/**
 * 本机权威库（TECH-ARCHITECTURE.md §5.3）。
 *
 * MVP 的 7 张业务表在 version 1；`year_reviews` 随 P05 年轮在 version 2 启用。
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
  yearReviews!: Table<YearReview, string>;

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

    // P05 年轮：每用户每年一行，只存年度总结。
    this.version(DB_VERSION).stores({
      year_reviews: 'id, ownerId, &[ownerId+year]',
    });
    // 表名与属性名不一致时手动映射，避免 `db.yearReviews` 为 undefined。
    this.yearReviews = this.table<YearReview, string>('year_reviews');
  }
}

export const db = new CommitToDoDatabase();

/** MVP 只有本机一个 owner；V2 接入账号后由会话提供。 */
export const LOCAL_OWNER_ID = 'local';
