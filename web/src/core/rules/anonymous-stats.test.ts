import { describe, expect, it } from 'vitest';
import {
  STATS_PAYLOAD_KEYS,
  buildAnonymousStatsPayload,
  isStatsDue,
  previousLocalDate,
  pruneStatsQueue,
} from './anonymous-stats';

describe('匿名统计上报包（V2-02 §8.2 / J-07）', () => {
  it('键集合恰好等于白名单', () => {
    const payload = buildAnonymousStatsPayload({
      installId: 'install-1',
      localDate: '2026-11-20',
      commitCount: 5,
      activeBranchCount: 2,
      appVersion: '1.0.0',
      platform: 'web',
    });
    expect(Object.keys(payload).sort()).toEqual([...STATS_PAYLOAD_KEYS].sort());
    expect(payload).toEqual({
      installId: 'install-1',
      localDate: '2026-11-20',
      commitCount: 5,
      activeBranchCount: 2,
      appVersion: '1.0.0',
      platform: 'web',
    });
  });

  it('上下文里的标题、分支名、备注、账号与实体 ID 全部被丢弃', () => {
    const payload = buildAnonymousStatsPayload({
      installId: 'install-1',
      localDate: '2026-11-20',
      commitCount: 0,
      activeBranchCount: 0,
      appVersion: '1.0.0',
      platform: 'web',
      title: '写周报',
      branchName: '产品设计',
      note: '周一前完成',
      ownerId: 'owner-9',
      principalId: 'principal-9',
      email: 'me@example.com',
      entityId: 'task-1',
      extra: { nested: true },
    });
    expect(payload.commitCount).toBe(0);
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('branchName');
    expect(payload).not.toHaveProperty('note');
    expect(payload).not.toHaveProperty('ownerId');
    expect(payload).not.toHaveProperty('principalId');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('entityId');
    expect(JSON.stringify(payload)).not.toContain('写周报');
    expect(JSON.stringify(payload)).not.toContain('产品设计');
  });

  it('标题含 JSON 片段或换行、字段名形似白名单键时也不进入 payload', () => {
    const payload = buildAnonymousStatsPayload({
      installId: 'install-1',
      localDate: '2026-11-20',
      commitCount: 1,
      activeBranchCount: 1,
      appVersion: '1.0.0',
      platform: 'web',
      '{"localDate":"2099-01-01"}': 'x',
      'commitCount\n': 999,
      note: '第一行\n第二行',
    });
    expect(payload.localDate).toBe('2026-11-20');
    expect(payload.commitCount).toBe(1);
  });

  it('队列只保留最近 7 天，并排除未来日期', () => {
    const queue = [
      { localDate: '2026-11-13' },
      { localDate: '2026-11-14' },
      { localDate: '2026-11-20' },
      { localDate: '2026-11-21' },
      { localDate: 'bad-date' },
    ];
    expect(pruneStatsQueue(queue, '2026-11-20')).toEqual([
      { localDate: '2026-11-14' },
      { localDate: '2026-11-20' },
    ]);
  });

  it('次日只上报前一日一次', () => {
    expect(previousLocalDate('2026-11-21')).toBe('2026-11-20');
    expect(isStatsDue(null, '2026-11-21')).toBe(true);
    expect(isStatsDue('2026-11-20', '2026-11-21')).toBe(false);
    expect(isStatsDue('2026-11-19', '2026-11-21')).toBe(true);
  });
});
