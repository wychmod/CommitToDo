/**
 * 首页示例时间轴（docs/HOMEPAGE-MOTION.md）。
 *
 * 0–200 ms 底纹擦出，600 ms 勾选与便签，720–1,040 ms 点线，
 * 990–1,190 ms 回执抬升，1,190–1,400 ms 停在完成态。
 * 这里只做纯计算，不依赖 React、DOM 与真实时钟，方便单测覆盖边界。
 */
export const HOME_DEMO_END = 1400;
export const HOME_DEMO_BEZEL_END = 200;
export const HOME_DEMO_CHECK_AT = 600;
export const HOME_DEMO_LINE_START = 720;
export const HOME_DEMO_LINE_END = 1040;
export const HOME_DEMO_RECEIPT_START = 990;
export const HOME_DEMO_RECEIPT_END = 1190;

export type HomeDemoPhase = 'bezel' | 'hold' | 'check' | 'line' | 'receipt' | 'done';

export interface HomeDemoFrame {
  /** 当前所处段落，用于给工作台加 data 属性。 */
  phase: HomeDemoPhase;
  /** 标题底纹擦出进度 0–1。 */
  bezel: number;
  /** 示例待办是否已勾选。 */
  checked: boolean;
  /** 点线描出进度 0–1。 */
  line: number;
  /** 回执抬升进度 0–1。 */
  receipt: number;
  /** 整段演示是否结束。 */
  finished: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function progressBetween(elapsed: number, start: number, end: number): number {
  return clamp01((elapsed - start) / (end - start));
}

export function homeDemoPhaseAt(elapsed: number): HomeDemoPhase {
  if (elapsed < HOME_DEMO_BEZEL_END) return 'bezel';
  if (elapsed < HOME_DEMO_CHECK_AT) return 'hold';
  if (elapsed < HOME_DEMO_LINE_START) return 'check';
  if (elapsed < HOME_DEMO_LINE_END) return 'line';
  if (elapsed < HOME_DEMO_RECEIPT_END) return 'receipt';
  return 'done';
}

export function homeDemoFrameAt(elapsed: number): HomeDemoFrame {
  const bounded = Math.min(HOME_DEMO_END, Math.max(0, elapsed));
  return {
    phase: homeDemoPhaseAt(bounded),
    bezel: progressBetween(bounded, 0, HOME_DEMO_BEZEL_END),
    checked: bounded >= HOME_DEMO_CHECK_AT,
    line: progressBetween(bounded, HOME_DEMO_LINE_START, HOME_DEMO_LINE_END),
    receipt: progressBetween(bounded, HOME_DEMO_RECEIPT_START, HOME_DEMO_RECEIPT_END),
    finished: bounded >= HOME_DEMO_END,
  };
}
