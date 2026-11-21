import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  Badge,
  Backup,
  Branch,
  Commit,
  EventRecord,
  Milestone,
  Settings,
  Task,
  YearReview,
} from './types';

/** 当前库版本；只有增删表、索引或主键才 bump（CODE-STRUCTURE §5）。 */
export const DB_VERSION = 3;

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
  backups!: EntityTable<Backup, 'id'>;
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
    this.version(2).stores({
      year_reviews: 'id, ownerId, &[ownerId+year]',
    });

    // V1-06 备份与快照：保留策略按 [ownerId+kind+createdAt] 逐类取上限。
    this.version(3).stores({
      backups: 'id, ownerId, kind, createdAt, [ownerId+createdAt], [ownerId+kind+createdAt]',
    });
    // 表名与属性名不一致时手动映射，避免 `db.yearReviews` 为 undefined。
    this.yearReviews = this.table<YearReview, string>('year_reviews');
  }
}

export const db = new CommitToDoDatabase();

const OWNER_STORAGE_KEY = 'committodo.owner';

function readOwnerId(): string {
  try {
    return window.localStorage.getItem(OWNER_STORAGE_KEY) ?? 'local';
  } catch {
    return 'local';
  }
}

/**
 * 业务数据的当前归属（PRD V2-01 OP-08）。
 *
 * 未登录固定为 `local`；登录成功后由 `assignOwnerTo()` 改为账号的 `principalId`
 * 并写入 localStorage，刷新后仍按该归属读取。退出登录保留归属，本机数据不清空。
 * 这是一处受控的可变导出，读取方在调用时取值即可拿到最新归属。
 */
export let LOCAL_OWNER_ID = readOwnerId();

export function setOwnerId(next: string): void {
  if (next.length === 0 || next === LOCAL_OWNER_ID) return;
  LOCAL_OWNER_ID = next;
  try {
    window.localStorage.setItem(OWNER_STORAGE_KEY, next);
  } catch {
    // 浏览器禁用存储时只保留本次会话内的归属。
  }
}
