import { describe, expect, it } from 'vitest';
import {
  HOME_DEMO_CHECK_AT,
  HOME_DEMO_END,
  HOME_DEMO_LINE_END,
  HOME_DEMO_LINE_START,
  HOME_DEMO_RECEIPT_END,
  HOME_DEMO_RECEIPT_START,
  homeDemoFrameAt,
  homeDemoPhaseAt,
} from './home-demo';

describe('首页示例时间轴', () => {
  it('按 0–1,400 ms 的六个段落推进', () => {
    expect(homeDemoPhaseAt(0)).toBe('bezel');
    expect(homeDemoPhaseAt(199)).toBe('bezel');
    expect(homeDemoPhaseAt(200)).toBe('hold');
    expect(homeDemoPhaseAt(599)).toBe('hold');
    expect(homeDemoPhaseAt(600)).toBe('check');
    expect(homeDemoPhaseAt(719)).toBe('check');
    expect(homeDemoPhaseAt(720)).toBe('line');
    expect(homeDemoPhaseAt(1039)).toBe('line');
    expect(homeDemoPhaseAt(1040)).toBe('receipt');
    expect(homeDemoPhaseAt(1189)).toBe('receipt');
    expect(homeDemoPhaseAt(1190)).toBe('done');
    expect(homeDemoPhaseAt(HOME_DEMO_END)).toBe('done');
  });

  it('勾选只发生在 600 ms 之后，结束前一直保持', () => {
    expect(homeDemoFrameAt(HOME_DEMO_CHECK_AT - 1).checked).toBe(false);
    expect(homeDemoFrameAt(HOME_DEMO_CHECK_AT).checked).toBe(true);
    expect(homeDemoFrameAt(HOME_DEMO_END).checked).toBe(true);
  });

  it('点线与回执按各自区间从 0 涨到 1', () => {
    expect(homeDemoFrameAt(HOME_DEMO_LINE_START - 1).line).toBe(0);
    expect(homeDemoFrameAt(HOME_DEMO_LINE_START).line).toBe(0);
    expect(homeDemoFrameAt(HOME_DEMO_LINE_END).line).toBe(1);
    expect(homeDemoFrameAt(HOME_DEMO_RECEIPT_START - 1).receipt).toBe(0);
    expect(homeDemoFrameAt(HOME_DEMO_RECEIPT_START).receipt).toBe(0);
    expect(homeDemoFrameAt(HOME_DEMO_RECEIPT_END).receipt).toBe(1);
  });

  it('越界输入被夹在 0–1,400 ms 之间', () => {
    const before = homeDemoFrameAt(-100);
    expect(before.phase).toBe('bezel');
    expect(before.bezel).toBe(0);
    expect(before.checked).toBe(false);
    expect(before.finished).toBe(false);

    const after = homeDemoFrameAt(9999);
    expect(after.phase).toBe('done');
    expect(after.bezel).toBe(1);
    expect(after.line).toBe(1);
    expect(after.receipt).toBe(1);
    expect(after.finished).toBe(true);
  });
});
