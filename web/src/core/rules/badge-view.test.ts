import { describe, expect, it } from 'vitest';
import { resolveBadgeView, type BadgeViewRows } from './badge-view';

const AT = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;
const EMPTY: BadgeViewRows = { commits: [], branches: [], milestones: [] };

describe('resolveBadgeView（M11 OP-04 / OP-07）', () => {
  it('起笔跳到触发提交', () => {
    const result = resolveBadgeView(
      { catalogId: 'first-commit', sourceEntityId: 'c1', snapshot: { commitId: 'c1' } },
      {
        ...EMPTY,
        commits: [
          {
            id: 'c1',
            branchId: 'b1',
            date: '2026-11-21',
            voidedAt: null,
            deletedAt: null,
          },
        ],
      },
      TZ,
    );

    expect(result).toEqual({
      state: 'ok',
      jump: { branchId: 'b1', date: '2026-11-21', commitId: 'c1' },
    });
  });

  it('触发提交已撤销时标注撤销且不给跳转', () => {
    const result = resolveBadgeView(
      { catalogId: 'first-commit', sourceEntityId: 'c1', snapshot: {} },
      {
        ...EMPTY,
        commits: [
          {
            id: 'c1',
            branchId: 'b1',
            date: '2026-11-21',
            voidedAt: AT,
            deletedAt: null,
          },
        ],
      },
      TZ,
    );

    expect(result).toEqual({ state: 'revoked', jump: null });
  });

  it('来源被删除或找不到时标注不可用', () => {
    expect(
      resolveBadgeView(
        { catalogId: 'first-commit', sourceEntityId: 'c1', snapshot: {} },
        { ...EMPTY, commits: [] },
        TZ,
      ),
    ).toEqual({ state: 'missing', jump: null });

    expect(
      resolveBadgeView(
        { catalogId: 'first-branch', sourceEntityId: 'b1', snapshot: {} },
        {
          ...EMPTY,
          branches: [
            {
              id: 'b1',
              parentId: 'root',
              createdAt: AT,
              finishedAt: null,
              finishedIntoId: null,
              deletedAt: AT,
            },
          ],
        },
        TZ,
      ),
    ).toEqual({ state: 'missing', jump: null });
  });

  it('第一道岔跳到分支创建日', () => {
    const result = resolveBadgeView(
      { catalogId: 'first-branch', sourceEntityId: 'b1', snapshot: {} },
      {
        ...EMPTY,
        branches: [
          {
            id: 'b1',
            parentId: 'root',
            createdAt: Date.UTC(2026, 10, 20, 17, 0),
            finishedAt: null,
            finishedIntoId: null,
            deletedAt: null,
          },
        ],
      },
      TZ,
    );

    expect(result).toEqual({
      state: 'ok',
      jump: { branchId: 'b1', date: '2026-11-21' },
    });
  });

  it('立碑按精度对齐跳转日', () => {
    const result = resolveBadgeView(
      { catalogId: 'first-milestone', sourceEntityId: 'm1', snapshot: {} },
      {
        ...EMPTY,
        milestones: [
          { id: 'm1', branchId: 'b1', achievedAt: AT, datePrecision: 'month', deletedAt: null },
        ],
      },
      TZ,
    );

    expect(result).toEqual({
      state: 'ok',
      jump: { branchId: 'b1', date: '2026-11-01', milestoneId: 'm1' },
    });
  });

  it('汇流跳到父分支的收尾日', () => {
    const result = resolveBadgeView(
      { catalogId: 'first-merge', sourceEntityId: 'child', snapshot: {} },
      {
        ...EMPTY,
        branches: [
          {
            id: 'child',
            parentId: 'root',
            createdAt: AT - 10_000,
            finishedAt: AT,
            finishedIntoId: 'root',
            deletedAt: null,
          },
        ],
      },
      TZ,
    );

    expect(result).toEqual({
      state: 'ok',
      jump: { branchId: 'root', date: '2026-11-21' },
    });
  });

  it('未知徽章不猜测跳转', () => {
    expect(
      resolveBadgeView({ catalogId: 'future', sourceEntityId: null, snapshot: {} }, EMPTY, TZ),
    ).toEqual({ state: 'missing', jump: null });
  });
});
