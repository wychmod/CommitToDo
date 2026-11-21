import { describe, expect, it } from 'vitest';
import type { BadgeBranchRow, BadgeCommitRow, BadgeMilestoneRow } from './badges';
import { assessStructureBadges } from './badge-structure';

const AT = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;
const DAY = 86_400_000;

interface Rows {
  branches: BadgeBranchRow[];
  commits: BadgeCommitRow[];
  milestones: BadgeMilestoneRow[];
}

function branch(over: Partial<BadgeBranchRow> & { id: string }): BadgeBranchRow {
  return {
    parentId: null,
    depth: 1,
    title: over.id,
    status: 'active',
    createdAt: AT,
    finishedAt: null,
    finishedIntoId: null,
    droppedAt: null,
    dropReason: null,
    archivedAt: null,
    deletedAt: null,
    ...over,
  };
}

function commit(over: Partial<BadgeCommitRow> & { id: string }): BadgeCommitRow {
  return {
    branchId: 'b1',
    summary: over.id,
    date: '2026-11-21',
    at: AT,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function rows(over: Partial<Rows>): Rows {
  return { branches: [], commits: [], milestones: [], ...over };
}

function candidates(over: Partial<Rows>): string[] {
  return assessStructureBadges(rows(over), AT, TZ).candidates.map((item) => item.catalogId);
}

describe('结构类徽章（V1-05 OP-02）', () => {
  it('第一道岔只认 depth ≥ 2 且未删除的子分支', () => {
    expect(
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'child', parentId: 'root', depth: 1 }),
        ],
      }),
    ).not.toContain('first-fork');

    expect(
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'child', parentId: 'root', depth: 1 }),
          branch({ id: 'grand', parentId: 'child', depth: 2 }),
        ],
      }),
    ).toContain('first-fork');

    expect(
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'child', parentId: 'root', depth: 1 }),
          branch({
            id: 'grand',
            parentId: 'child',
            depth: 2,
            deletedAt: AT,
          }),
        ],
      }),
    ).not.toContain('first-fork');
  });

  it('收束要求全部未删除子分支 merged，放下不算', () => {
    const base = [
      branch({ id: 'root', depth: 0 }),
      branch({ id: 'p', parentId: 'root', depth: 1 }),
      branch({ id: 'c1', parentId: 'p', depth: 2, status: 'merged', finishedAt: AT }),
      branch({ id: 'c2', parentId: 'p', depth: 2, status: 'merged', finishedAt: AT + DAY }),
    ];

    expect(candidates({ branches: base })).toContain('all-merged');

    expect(
      candidates({
        branches: [
          ...base.slice(0, 3),
          branch({
            id: 'c2',
            parentId: 'p',
            depth: 2,
            status: 'dropped',
            droppedAt: AT + DAY,
            dropReason: '方向不对',
          }),
        ],
      }),
    ).not.toContain('all-merged');
  });

  it('已归档但已合并的子分支仍计入收束', () => {
    expect(
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'p', parentId: 'root', depth: 1 }),
          branch({ id: 'c1', parentId: 'p', depth: 2, status: 'merged', finishedAt: AT }),
          branch({
            id: 'c2',
            parentId: 'p',
            depth: 2,
            status: 'merged',
            finishedAt: AT,
            archivedAt: AT + DAY,
          }),
        ],
      }),
    ).toContain('all-merged');
  });

  it('根分支不参与收束与汇流', () => {
    const start = AT;
    const found = candidates({
      branches: [
        branch({ id: 'root', depth: 0, status: 'merged', finishedAt: start }),
        branch({ id: 'p', parentId: 'root', depth: 1 }),
      ],
    });

    expect(found).not.toContain('all-merged');
    expect(found).not.toContain('first-merge');
  });

  it('双线并行按活跃区间交集 14 天判定', () => {
    const pair = (days: number) =>
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'p', parentId: 'root', depth: 1 }),
          branch({
            id: 'a',
            parentId: 'p',
            depth: 2,
            createdAt: AT,
            finishedAt: AT + days * DAY,
          }),
          branch({
            id: 'b',
            parentId: 'p',
            depth: 2,
            createdAt: AT,
            finishedAt: AT + days * DAY,
          }),
        ],
      });

    expect(pair(14)).toContain('dual-lanes');
    expect(pair(13)).not.toContain('dual-lanes');
  });

  it('有始有终要求 L3 收尾且本分支有效提交 ≥10 条', () => {
    const make = (count: number, voided = 0) =>
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'l1', parentId: 'root', depth: 1 }),
          branch({ id: 'l2', parentId: 'l1', depth: 2 }),
          branch({ id: 'l3', parentId: 'l2', depth: 3, status: 'merged', finishedAt: AT }),
        ],
        commits: Array.from({ length: count }, (_, index) =>
          commit({
            id: `c${index}`,
            branchId: 'l3',
            at: AT + index,
            voidedAt: index < voided ? AT : null,
          }),
        ),
      });

    expect(make(10)).toContain('well-ended');
    expect(make(9)).not.toContain('well-ended');
    expect(make(10, 1)).not.toContain('well-ended');
  });

  it('五面按一级分支子树统计，根分支不是候选', () => {
    const branches = [
      branch({ id: 'root', depth: 0 }),
      ...Array.from({ length: 5 }, (_, index) =>
        branch({ id: `b${index}`, parentId: 'root', depth: 1 }),
      ),
      branch({ id: 'b0-child', parentId: 'b0', depth: 2 }),
    ];
    const commits = [
      commit({ id: 'c0', branchId: 'b0-child' }),
      ...Array.from({ length: 4 }, (_, index) =>
        commit({ id: `c${index + 1}`, branchId: `b${index + 1}` }),
      ),
      commit({ id: 'root-c', branchId: 'root' }),
    ];

    expect(candidates({ branches, commits })).toContain('five-faces');
  });

  it('主干要求连续 3 个自然月，中间断一个月不获得', () => {
    const withMonths = (dates: string[]) =>
      candidates({
        branches: [
          branch({ id: 'root', depth: 0 }),
          branch({ id: 'b1', parentId: 'root', depth: 1 }),
        ],
        commits: dates.map((date, index) => commit({ id: `c${index}`, date })),
      });

    expect(withMonths(['2026-01-05', '2026-02-05', '2026-03-05'])).toContain('trunk');
    expect(withMonths(['2026-01-05', '2026-03-05', '2026-04-05'])).not.toContain('trunk');
  });
});
