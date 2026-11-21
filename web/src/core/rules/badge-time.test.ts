import { describe, expect, it } from 'vitest';
import type { BadgeBranchRow, BadgeCommitRow, BadgeMilestoneRow } from './badges';
import { assessTimeBadges } from './badge-time';

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
    parentId: 'root',
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

function milestone(over: Partial<BadgeMilestoneRow> & { id: string }): BadgeMilestoneRow {
  return {
    branchId: 'b1',
    title: over.id,
    note: null,
    achievedAt: AT,
    datePrecision: 'day',
    createdAt: AT,
    deletedAt: null,
    ...over,
  };
}

function rows(over: Partial<Rows>): Rows {
  return { branches: [], commits: [], milestones: [], ...over };
}

function assess(over: Partial<Rows>, nowMs = AT, tz = TZ) {
  return assessTimeBadges(rows(over), nowMs, tz);
}

function found(over: Partial<Rows>, nowMs = AT, tz = TZ): string[] {
  return assess(over, nowMs, tz).candidates.map((item) => item.catalogId);
}

describe('时间类徽章（V1-05 OP-03）', () => {
  it('起笔取第一条有效提交', () => {
    const result = assess({
      commits: [
        commit({ id: 'voided', at: AT - DAY, voidedAt: AT }),
        commit({ id: 'valid', at: AT }),
      ],
    });

    const candidate = result.candidates.find((item) => item.catalogId === 'first-commit');
    expect(candidate?.sourceEntityId).toBe('valid');
  });

  it('补白只认日期在过去的里程碑', () => {
    expect(
      found({
        milestones: [milestone({ id: 'past', achievedAt: AT - DAY, createdAt: AT })],
      }),
    ).toContain('backfill');

    expect(
      found({
        milestones: [milestone({ id: 'today', achievedAt: AT, createdAt: AT })],
      }),
    ).not.toContain('backfill');
  });

  it('常青只计本分支自己的提交，连续 6 个自然月', () => {
    const ownCommits = [
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
      '2026-04-05',
      '2026-05-05',
      '2026-06-05',
    ].map((date, index) => commit({ id: `own-${index}`, branchId: 'b1', date }));

    expect(
      found({
        branches: [branch({ id: 'b1' })],
        commits: ownCommits,
      }),
    ).toContain('evergreen');

    const childOnly = ownCommits.map((_, index) =>
      commit({ id: `child-${index}`, branchId: 'child', date: `2026-0${index + 1}-05` }),
    );
    const result = assess({
      branches: [branch({ id: 'b1' }), branch({ id: 'child', parentId: 'b1', depth: 2 })],
      commits: childOnly,
    });
    const evergreen = result.candidates.find((item) => item.catalogId === 'evergreen');
    expect(evergreen?.sourceEntityId).toBe('child');
  });

  it('常青中间断一个月不获得', () => {
    expect(
      found({
        branches: [branch({ id: 'b1' })],
        commits: [
          '2026-01-05',
          '2026-02-05',
          '2026-04-05',
          '2026-05-05',
          '2026-06-05',
          '2026-07-05',
        ].map((date, index) => commit({ id: `c${index}`, date })),
      }),
    ).not.toContain('evergreen');
  });

  it('第一年满 365 天才获得，提前一天不获得', () => {
    const start = Date.UTC(2026, 0, 1);

    expect(
      found(
        { branches: [branch({ id: 'root', parentId: null, depth: 0, createdAt: start })] },
        Date.UTC(2026, 11, 31),
        0,
      ),
    ).not.toContain('first-year');

    expect(
      found(
        { branches: [branch({ id: 'root', parentId: null, depth: 0, createdAt: start })] },
        Date.UTC(2027, 0, 1),
        0,
      ),
    ).toContain('first-year');
  });

  it('连续月份跨年也能成立', () => {
    expect(
      found({
        branches: [branch({ id: 'b1' })],
        commits: [
          '2025-12-05',
          '2026-01-05',
          '2026-02-05',
          '2026-03-05',
          '2026-04-05',
          '2026-05-05',
        ].map((date, index) => commit({ id: `c${index}`, date })),
      }),
    ).toContain('evergreen');
  });
});
