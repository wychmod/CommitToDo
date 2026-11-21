import { describe, expect, it } from 'vitest';
import type { BadgeMilestoneRow } from './badges';
import { assessMilestoneBadges } from './badge-milestone';

const AT = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;

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

function assess(milestones: BadgeMilestoneRow[]) {
  return assessMilestoneBadges({ milestones }, TZ);
}

function found(milestones: BadgeMilestoneRow[]): string[] {
  return assess(milestones).candidates.map((item) => item.catalogId);
}

describe('里程碑类徽章（V1-05 OP-04）', () => {
  it('第 3 个未删除里程碑授三碑，第 2 个不授', () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        milestone({ id: `m${index}`, achievedAt: AT + index * 1_000 }),
      );

    expect(found(make(2))).not.toContain('three-milestones');
    expect(found(make(3))).toContain('three-milestones');
  });

  it('删除里程碑后按剩余数量重算', () => {
    const rows = [
      milestone({ id: 'm0' }),
      milestone({ id: 'm1', achievedAt: AT + 1_000 }),
      milestone({ id: 'm2', achievedAt: AT + 2_000, deletedAt: AT + 3_000 }),
    ];

    expect(found(rows)).toContain('first-milestone');
    expect(found(rows)).not.toContain('three-milestones');
  });

  it('首个非空备注授碑上有字，空白备注不算', () => {
    expect(
      found([
        milestone({ id: 'm0', achievedAt: AT }),
        milestone({ id: 'm1', achievedAt: AT + 1_000, note: '   ' }),
      ]),
    ).not.toContain('milestone-note');

    const result = assess([
      milestone({ id: 'm0', achievedAt: AT }),
      milestone({ id: 'm1', achievedAt: AT + 1_000, note: '  记一笔  ' }),
    ]);
    const candidate = result.candidates.find((item) => item.catalogId === 'milestone-note');
    expect(candidate?.sourceEntityId).toBe('m1');
    expect(candidate?.snapshot.note).toBe('记一笔');
  });

  it('同一年第 3 个里程碑授年轮有痕，跨年不算', () => {
    expect(
      found([
        milestone({ id: 'm0', achievedAt: Date.UTC(2026, 0, 5) }),
        milestone({ id: 'm1', achievedAt: Date.UTC(2026, 5, 5) }),
        milestone({ id: 'm2', achievedAt: Date.UTC(2026, 10, 5) }),
      ]),
    ).toContain('year-marks');

    expect(
      found([
        milestone({ id: 'm0', achievedAt: Date.UTC(2025, 11, 5) }),
        milestone({ id: 'm1', achievedAt: Date.UTC(2026, 0, 5) }),
        milestone({ id: 'm2', achievedAt: Date.UTC(2026, 5, 5) }),
      ]),
    ).not.toContain('year-marks');
  });

  it('年轮有痕的快照带年份与三枚里程碑', () => {
    const result = assess([
      milestone({ id: 'm0', achievedAt: Date.UTC(2026, 0, 5) }),
      milestone({ id: 'm1', achievedAt: Date.UTC(2026, 5, 5) }),
      milestone({ id: 'm2', achievedAt: Date.UTC(2026, 10, 5) }),
    ]);
    const candidate = result.candidates.find((item) => item.catalogId === 'year-marks');

    expect(candidate?.snapshot.year).toBe(2026);
    expect(candidate?.snapshot.milestoneIds).toEqual(['m0', 'm1', 'm2']);
  });
});
