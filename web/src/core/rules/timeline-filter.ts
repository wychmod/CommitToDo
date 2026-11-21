/**
 * 历程筛选与直达（M06 §4.3 / OP-05、OP-06）。
 *
 * 筛选只按根分支或一级分支；选中后保留该线及其全部可见后代。
 * 直达只产生临时显示标记，绝不改写已保存的筛选；只有用户手动修改才覆盖。
 */

import { isTimeRangeKind, type TimeRangeKind } from './time-range';

export interface HistoryFilter {
  range: TimeRangeKind;
  /** `null` 表示全部分支；否则是根分支或一级分支的 id。 */
  branchId: string | null;
}

export const DEFAULT_HISTORY_FILTER: HistoryFilter = {
  range: 'recent90',
  branchId: null,
};

export interface FilterBranch {
  id: string;
  parentId: string | null;
}

export interface DirectTarget {
  branchId: string;
  /** `YYYY-MM-DD`，用于高亮该日期附近的节点。 */
  date: string;
}

export interface DirectResolution {
  target: DirectTarget | null;
  /** 目标所属泳道（一级分支或根）；找不到目标时为 `null`。 */
  laneId: string | null;
  /** 目标被当前筛选隐藏，需要临时显示并提示。 */
  temporary: boolean;
}

/** 读回本机保存的筛选；缺失或损坏时回落默认值。 */
export function normalizeHistoryFilter(value: unknown): HistoryFilter {
  if (!value || typeof value !== 'object') return { ...DEFAULT_HISTORY_FILTER };
  const row = value as Partial<HistoryFilter>;
  return {
    range: isTimeRangeKind(row.range) ? row.range : DEFAULT_HISTORY_FILTER.range,
    branchId: typeof row.branchId === 'string' ? row.branchId : null,
  };
}

/** 选中分支时可见的 id 集合；`null` 表示不筛选。 */
export function filterBranchIds(
  branches: readonly FilterBranch[],
  selectedId: string | null,
): Set<string> | null {
  if (!selectedId) return null;

  const children = new Map<string, FilterBranch[]>();
  for (const branch of branches) {
    if (branch.parentId === null) continue;
    const list = children.get(branch.parentId) ?? [];
    list.push(branch);
    children.set(branch.parentId, list);
  }

  const ids = new Set<string>([selectedId]);
  const walk = (id: string): void => {
    for (const child of children.get(id) ?? []) {
      ids.add(child.id);
      walk(child.id);
    }
  };
  walk(selectedId);
  return ids;
}

/** 目标所属泳道：根分支返回自身，其余上溯到一级分支。 */
export function laneForBranch(branches: readonly FilterBranch[], branchId: string): string | null {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  let current = byId.get(branchId);
  if (!current) return null;

  while (current.parentId !== null) {
    const parent = byId.get(current.parentId);
    if (!parent || parent.parentId === null) return current.id;
    current = parent;
  }
  return current.id;
}

/**
 * 直达解析。
 *
 * 返回目标泳道与是否需要临时显示；调用方据此合并可见集合，
 * 不修改传入的 `filter`，也不写入本机状态。
 */
export function resolveDirectTarget(
  filter: HistoryFilter,
  branches: readonly FilterBranch[],
  target: DirectTarget | null,
): DirectResolution {
  if (!target) return { target: null, laneId: null, temporary: false };

  const laneId = laneForBranch(branches, target.branchId);
  if (laneId === null) return { target: null, laneId: null, temporary: false };

  const visible = filterBranchIds(branches, filter.branchId);
  return {
    target,
    laneId,
    temporary: visible !== null && !visible.has(target.branchId),
  };
}

/** 只有用户手动改筛选才走这里；直达路径不得调用。 */
export function withManualFilter(
  current: HistoryFilter,
  patch: Partial<HistoryFilter>,
): HistoryFilter {
  return { ...current, ...patch };
}
