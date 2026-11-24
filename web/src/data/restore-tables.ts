import { recountBranch } from '@/core/rules/counters';
import type { ImportTables } from '@/core/rules/import-validate';
import { db, LOCAL_OWNER_ID } from './db';
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

/**
 * 导入 / 快照恢复共用的「整体替换业务表」（PRD M10 OP-05、V1-06 OP-04）。
 *
 * 两处逻辑曾经各写一份，先后漏掉 `year_reviews` 与 `ownerId` 改写。
 * 现在只保留这一份：
 * - 覆盖 `EXPORT_TABLES` 的全部表，新增表只改 `core/rules/export-file.ts`；
 * - 所有行强制改写为当前归属，避免「登录后导入本机导出文件 → 界面空白」；
 * - 分支四计数按文件内的待办与有效提交全量重算（R7），已撤销提交保留 `voidedAt`（R3）。
 *
 * 必须在用例的 `db.transaction` 内调用；这里用 `db.*` 访问表，Dexie 会把它们
 * 绑定到当前事务，与 `tx.table()` 等价，同时保留测试对单表写入的故障注入能力。
 */
export async function replaceBusinessTables(tables: ImportTables): Promise<void> {
  const ownerId = LOCAL_OWNER_ID;
  const reown = <T extends { id: string }>(row: T): T => ({ ...row, ownerId });

  const tasks = (tables.tasks as unknown as Task[]).map(reown);
  const commits = (tables.commits as unknown as Commit[]).map(reown);
  const branches = (tables.branches as unknown as Branch[]).map((branch) => ({
    ...reown(branch),
    ...recountBranch(branch.id, tasks, commits),
  }));

  await Promise.all([
    db.branches.clear(),
    db.tasks.clear(),
    db.commits.clear(),
    db.milestones.clear(),
    db.badges.clear(),
    db.settings.clear(),
    db.events.clear(),
    db.yearReviews.clear(),
  ]);

  await db.branches.bulkPut(branches);
  await db.tasks.bulkPut(tasks);
  await db.commits.bulkPut(commits);
  await db.milestones.bulkPut((tables.milestones as unknown as Milestone[]).map(reown));
  await db.badges.bulkPut((tables.badges as unknown as Badge[]).map(reown));
  await db.settings.bulkPut((tables.settings as unknown as Settings[]).map(reown));
  await db.events.bulkPut((tables.events as unknown as EventRecord[]).map(reown));
  await db.yearReviews.bulkPut((tables.year_reviews as unknown as YearReview[]).map(reown));
}

/** `EXPORT_TABLES` 覆盖的八张业务表；清空数据与替换共用，避免两处表清单漂移。 */
export const BUSINESS_TABLE_NAMES = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
  'settings',
  'events',
  'year_reviews',
] as const;
