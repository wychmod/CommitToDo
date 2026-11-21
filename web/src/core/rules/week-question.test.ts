import { describe, expect, it } from 'vitest';
import {
  pickWeekQuestion,
  type WeekQuestionBranch,
  type WeekQuestionCommit,
} from './week-question';

const commit = (over: Partial<WeekQuestionCommit> = {}): WeekQuestionCommit => ({
  branchId: 'a',
  at: 1_000,
  voidedAt: null,
  date: '2026-11-21',
  ...over,
});

const branch = (over: Partial<WeekQuestionBranch> = {}): WeekQuestionBranch => ({
  id: 'a',
  title: '工作',
  order: 0,
  status: 'active',
  ...over,
});

describe('周回顾提问分支选择（R9 / OP-03）', () => {
  it('取本周提交最多的分支', () => {
    const question = pickWeekQuestion({
      commits: [
        commit({ branchId: 'a' }),
        commit({ branchId: 'b' }),
        commit({ branchId: 'b' }),
        commit({ branchId: 'b' }),
      ],
      branches: [branch({ id: 'a', title: '生活' }), branch({ id: 'b', title: '工作' })],
    });

    expect(question).toMatchObject({
      template: 'today.weekReview.question.topBranch',
      branchId: 'b',
      branchTitle: '工作',
      commitCount: 4,
    });
  });

  it('提交数并列时取最近提交所在分支', () => {
    const question = pickWeekQuestion({
      commits: [
        commit({ branchId: 'a', at: 100 }),
        commit({ branchId: 'a', at: 200 }),
        commit({ branchId: 'b', at: 300 }),
        commit({ branchId: 'b', at: 400 }),
      ],
      branches: [branch({ id: 'a' }), branch({ id: 'b' })],
    });

    expect(question.branchId).toBe('b');
  });

  it('提交数与最近提交都并列时按分支 order', () => {
    const question = pickWeekQuestion({
      commits: [commit({ branchId: 'a', at: 100 }), commit({ branchId: 'b', at: 100 })],
      branches: [branch({ id: 'a', order: 9 }), branch({ id: 'b', order: 2 })],
    });

    expect(question.branchId).toBe('b');
  });

  it('四项全部并列时用分支 id 兜底，输出稳定', () => {
    const question = pickWeekQuestion({
      commits: ['d', 'c', 'b', 'a'].map((branchId) => commit({ branchId, at: 100 })),
      branches: ['a', 'b', 'c', 'd'].map((id) => branch({ id, order: 1 })),
    });

    expect(question.branchId).toBe('a');
  });

  it('唯一候选分支已删除时退化为通用提问', () => {
    const question = pickWeekQuestion({
      commits: [commit({ branchId: 'gone' })],
      branches: [branch({ id: 'gone', deletedAt: 1 })],
    });

    expect(question).toMatchObject({
      template: 'today.weekReview.question.generic',
      branchId: null,
      branchTitle: null,
    });
  });

  it('最高分支已删除时退化到次高分支', () => {
    const question = pickWeekQuestion({
      commits: [
        commit({ branchId: 'gone' }),
        commit({ branchId: 'gone' }),
        commit({ branchId: 'gone' }),
        commit({ branchId: 'live' }),
      ],
      branches: [branch({ id: 'gone', deletedAt: 1 }), branch({ id: 'live', title: '主业' })],
    });

    expect(question).toMatchObject({
      template: 'today.weekReview.question.topBranch',
      branchId: 'live',
      branchTitle: '主业',
    });
  });

  it('只有一条提交时仍指向该分支', () => {
    const question = pickWeekQuestion({
      commits: [commit({ branchId: 'a' })],
      branches: [branch()],
    });

    expect(question).toMatchObject({
      template: 'today.weekReview.question.topBranch',
      branchId: 'a',
      commitCount: 1,
    });
  });

  it('提交全在已放下分支时退化为通用提问', () => {
    const question = pickWeekQuestion({
      commits: [commit({ branchId: 'dropped' }), commit({ branchId: 'dropped' })],
      branches: [branch({ id: 'dropped', status: 'dropped' })],
    });

    expect(question.template).toBe('today.weekReview.question.generic');
  });

  it('已撤销提交不参与选择与计数', () => {
    const question = pickWeekQuestion({
      commits: [commit({ branchId: 'a', voidedAt: 1 }), commit({ branchId: 'b' })],
      branches: [branch({ id: 'a' }), branch({ id: 'b' })],
    });

    expect(question).toMatchObject({ branchId: 'b', commitCount: 1 });
  });
});
