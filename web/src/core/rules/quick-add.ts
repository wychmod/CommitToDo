/**
 * 快速添加的一句话识别（PRD M03 B-01 / O01）。
 *
 * 最小日期集合：`YYYY-MM-DD`、`今天`、`明天`、`后天`（README 冲突表 #17）。
 * 分支用 `#路径` 表达，如 `#工作/产品设计` 或 `#产品设计`；除这些显式写法外
 * 不做猜测，识别失败时保留原输入，由手动选择日期与分支兜底。
 */

import { addDays } from '@/core/clock';
import { branchTrail } from './branch-path';

export { branchTrail };

export interface QuickAddParse {
  /** 去掉已识别日期与分支标记后的标题；可能为空，调用方负责校验。 */
  title: string;
  /** 已识别的截止日期；未识别为 null。 */
  dueDate: string | null;
  /** `#` 后写下的分支查询串；未写为 null。 */
  branchQuery: string | null;
  dateToken: string | null;
  branchToken: string | null;
}

export interface BranchLabel {
  id: string;
  title: string;
  parentId: string | null;
}

interface Hit {
  index: number;
  length: number;
  token: string;
}

const RELATIVE_DAYS: ReadonlyArray<[string, number]> = [
  ['后天', 2],
  ['明天', 1],
  ['今天', 0],
];

const ABSOLUTE_DATE = /\d{4}-\d{2}-\d{2}/;

function earliest(hits: Hit[]): Hit | null {
  if (hits.length === 0) return null;
  return [...hits].sort((a, b) => a.index - b.index || b.length - a.length)[0];
}

function findDate(input: string, todayDate: string): { hit: Hit | null; dueDate: string | null } {
  const hits: Hit[] = [];
  const absolute = ABSOLUTE_DATE.exec(input);
  if (absolute) {
    hits.push({ index: absolute.index, length: absolute[0].length, token: absolute[0] });
  }
  for (const [token] of RELATIVE_DAYS) {
    const index = input.indexOf(token);
    if (index >= 0) hits.push({ index, length: token.length, token });
  }
  const hit = earliest(hits);
  if (!hit) return { hit: null, dueDate: null };

  if (ABSOLUTE_DATE.test(hit.token)) {
    return { hit, dueDate: hit.token };
  }
  const days = RELATIVE_DAYS.find(([token]) => token === hit.token)?.[1] ?? 0;
  return { hit, dueDate: addDays(todayDate, days) };
}

function findBranch(input: string): Hit | null {
  const match = /#([^\s#]+)/.exec(input);
  return match ? { index: match.index, length: match[0].length, token: match[1] } : null;
}

function removeTokens(input: string, hits: Array<Hit | null>): string {
  const ranges = hits
    .filter((hit): hit is Hit => hit !== null)
    .map((hit) => ({ start: hit.index, end: hit.index + hit.length }))
    .sort((a, b) => b.start - a.start);

  let output = input;
  for (const range of ranges) {
    output = `${output.slice(0, range.start)} ${output.slice(range.end)}`;
  }
  return output.replace(/\s+/g, ' ').trim();
}

export function parseQuickAdd(input: string, todayDate: string): QuickAddParse {
  const date = findDate(input, todayDate);
  const branch = findBranch(input);
  const title = removeTokens(input, [date.hit, branch]);

  return {
    title,
    dueDate: date.dueDate,
    branchQuery: branch?.token ?? null,
    dateToken: date.hit?.token ?? null,
    branchToken: branch?.token ?? null,
  };
}

/**
 * 按 `#` 后的查询串找分支：完整路径优先，其次同名末级。
 * 找不到返回 null，调用方保留输入并让用户手动选。
 */
export function resolveBranchQuery<T extends BranchLabel>(
  branches: readonly T[],
  query: string,
): T | null {
  const normalized = query.replace(/[\s/]+/g, '');
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const matchesTrail = (branch: T, withRoot: boolean): boolean => {
    const parts = branchTrail(branch, byId).split(' / ');
    const trail = (withRoot ? parts : parts.slice(1)).join('').replace(/[\s/]+/g, '');
    return trail === normalized;
  };

  const trailMatch = branches.find(
    (branch) => matchesTrail(branch, true) || matchesTrail(branch, false),
  );
  if (trailMatch) return trailMatch;
  return branches.find((branch) => branch.title === query.trim()) ?? null;
}
