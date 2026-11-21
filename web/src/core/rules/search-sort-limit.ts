/**
 * 搜索结果的分组、排序与上限（PRD V1-04 §3 / OP-05）。
 *
 * 组顺序固定为分支、待办、提交、里程碑；空组不输出。
 * 同组按匹配字段长度升序，同长按时间倒序；每组最多 20 条、总计最多 50 条，
 * 被截掉的条数写进 `hidden`，由界面提示「输入更多字缩小范围」。
 */

import type { SearchCandidate, SearchKind } from './search-visibility';

export const SEARCH_GROUP_ORDER: readonly SearchKind[] = ['branch', 'task', 'commit', 'milestone'];

export const SEARCH_GROUP_LIMIT = 20;
export const SEARCH_TOTAL_LIMIT = 50;

export interface SearchGroup {
  kind: SearchKind;
  items: SearchCandidate[];
  /** 该组因上限未展示的条数。 */
  hidden: number;
}

function compareCandidates(left: SearchCandidate, right: SearchCandidate): number {
  return (
    left.title.length - right.title.length || right.at - left.at || left.id.localeCompare(right.id)
  );
}

/** 分组、排序并截断；返回顺序即界面展示顺序。 */
export function groupSearchCandidates(candidates: readonly SearchCandidate[]): SearchGroup[] {
  const groups: SearchGroup[] = [];
  let remaining = SEARCH_TOTAL_LIMIT;

  for (const kind of SEARCH_GROUP_ORDER) {
    const rows = candidates
      .filter((candidate) => candidate.kind === kind)
      .slice()
      .sort(compareCandidates);
    if (rows.length === 0) continue;

    const capacity = Math.min(SEARCH_GROUP_LIMIT, remaining);
    const items = rows.slice(0, capacity);
    remaining -= items.length;
    groups.push({ kind, items, hidden: rows.length - items.length });
  }

  return groups;
}
