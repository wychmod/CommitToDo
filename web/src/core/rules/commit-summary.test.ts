import { describe, expect, it } from 'vitest';
import { COMMIT_SUMMARY_SEPARATOR, composeCommitSummary } from './commit-summary';

describe('composeCommitSummary（E-01 提交文案）', () => {
  it('没有补一句时等于待办标题', () => {
    expect(composeCommitSummary('交周报')).toBe('交周报');
    expect(composeCommitSummary('交周报', null)).toBe('交周报');
  });

  it('有补一句时为「标题 —— 补一句」', () => {
    expect(composeCommitSummary('交周报', '顺带同步下周计划')).toBe(
      `交周报${COMMIT_SUMMARY_SEPARATOR}顺带同步下周计划`,
    );
  });

  it('空白补一句按没有处理', () => {
    expect(composeCommitSummary('交周报', '   ')).toBe('交周报');
    expect(composeCommitSummary('交周报', '')).toBe('交周报');
  });

  it('重复调用不叠加分隔符', () => {
    const once = composeCommitSummary('交周报', '同步计划');
    const twice = composeCommitSummary('交周报', '同步计划');
    expect(twice).toBe(once);
    expect(twice.split(COMMIT_SUMMARY_SEPARATOR)).toHaveLength(2);
  });

  it('标题本身含「——」时原样保留', () => {
    expect(composeCommitSummary('周报 —— 第二版', '已发出')).toBe(
      `周报 —— 第二版${COMMIT_SUMMARY_SEPARATOR}已发出`,
    );
  });
});
