import { describe, expect, it } from 'vitest';
import type { BadgeCandidate } from './badge-catalog';
import { selectNewBadges } from './badge-grant';

function candidate(catalogId: BadgeCandidate['catalogId']): BadgeCandidate {
  return {
    catalogId,
    category:
      catalogId === 'first-commit' || catalogId === 'backfill'
        ? 'time'
        : catalogId === 'first-milestone' || catalogId === 'three-milestones'
          ? 'milestone'
          : 'structure',
    sourceEntityId: `src-${catalogId}`,
    snapshot: {},
  };
}

describe('徽章授予选择与幂等（V1-05 OP-05）', () => {
  it('已存在同 catalogId 的记录即跳过', () => {
    const result = selectNewBadges(
      [candidate('first-commit'), candidate('first-milestone')],
      [{ catalogId: 'first-commit' }],
    );

    expect(result.map((item) => item.catalogId)).toEqual(['first-milestone']);
  });

  it('旧标识 first-branch 阻止重复授予 first-fork', () => {
    const result = selectNewBadges([candidate('first-fork')], [{ catalogId: 'first-branch' }]);

    expect(result).toEqual([]);
  });

  it('一次满足多枚时按目录顺序全部返回', () => {
    const result = selectNewBadges(
      [candidate('year-marks'), candidate('first-commit'), candidate('first-fork')],
      [],
    );

    expect(result.map((item) => item.catalogId)).toEqual([
      'first-commit',
      'first-fork',
      'year-marks',
    ]);
  });

  it('同批重复满足只返回一次', () => {
    const result = selectNewBadges([candidate('first-commit'), candidate('first-commit')], []);

    expect(result).toHaveLength(1);
    expect(result[0]!.catalogId).toBe('first-commit');
  });

  it('已授予后触发事件撤销也不再返回', () => {
    const result = selectNewBadges([candidate('first-commit')], [{ catalogId: 'first-commit' }]);

    expect(result).toEqual([]);
  });

  it('导入后的会话跳过补查，缺失徽章也不补发', () => {
    const result = selectNewBadges([candidate('first-commit'), candidate('first-milestone')], [], {
      skipBackfill: true,
    });

    expect(result).toEqual([]);
  });

  it('空满足集不产生授予', () => {
    expect(selectNewBadges([], [{ catalogId: 'first-commit' }])).toEqual([]);
  });
});
