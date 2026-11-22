/**
 * `events.action` 与 payload 的类型化映射（docs/CODE-STRUCTURE.md §4）。
 *
 * action 统一 `entity.verb`；批量动作合并为一条，用 `count` / `movedCount` 记条数。
 * 新增动作时先在这里加一条，再在用例里调用 `writeEvent`。
 */
export type EventPayloads = {
  'task.create': { taskId: string; branchId: string; source?: 'bulk' };
  'task.complete': { taskId: string; commitId: string; branchId: string };
  'task.cancel': { taskId: string; branchId: string };
  'task.reopen': { taskId: string; branchId: string; voidedCommitId: string | null };
  'task.plan': { taskId: string; from: string | null; to: string | null };
  'task.update': {
    taskId: string;
    fields: string[];
    fromBranchId?: string;
    toBranchId?: string;
  };
  'task.delete': { taskId: string; branchId: string };

  'commit.void': { commitId: string; taskId: string | null };
  'commit.update': { commitId: string; fields: string[] };

  'branch.create': { branchId: string; parentId: string | null };
  'branch.rename': { branchId: string; from: string; to: string };
  'branch.move': { branchId: string; fromParentId: string; toParentId: string; movedCount: number };
  'branch.update': { branchId: string; fields: string[] };
  'branch.finish': {
    branchId: string;
    finishedIntoId: string;
    archived: boolean;
    movedTaskCount: number;
  };
  'branch.pause': { branchId: string; reason: string };
  'branch.resume': { branchId: string };
  'branch.archive': { branchId: string; subtreeCount: number };
  'branch.unarchive': { branchId: string; subtreeCount: number };

  'milestone.create': { milestoneId: string; branchId: string; source?: 'backfill' };

  'badge.grant': { badgeId: string; catalogId: string; periodKey: string };

  'settings.update': { fields: string[] };

  'data.export': { counts: Record<string, number> };
  'data.import': { counts: Record<string, number>; schemaVersion: number };
  'data.clear': { counts: Record<string, number> };
  'backup.create': { backupId: string; kind: string };
  'backup.restore': { backupId: string; schemaVersion: number };

  'sync.conflict': {
    branchId: string | null;
    entityId: string;
    field: string;
    entity?: string;
    deviceId?: string;
  };
};

export type EventAction = keyof EventPayloads;
