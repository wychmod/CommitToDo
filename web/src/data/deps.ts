import { currentTzOffset, systemClock, type Clock } from '@/core/clock';
import { systemIds, type IdSource } from '@/core/ids';

/**
 * 用例的写入依赖（docs/CODE-STRUCTURE.md §2）。
 *
 * 用例签名统一为 `useCase(input, deps = defaultWriteDeps)`；
 * 测试传固定时钟、固定 ID 与固定时区偏移，生产走系统实现。
 */
export interface WriteDeps {
  clock: Clock;
  ids: IdSource;
  /** 写入时刻的本地时区偏移（东正西负，分钟），events 审计行使用。 */
  tzOffset(epochMs: number): number;
}

export const defaultWriteDeps: WriteDeps = {
  clock: systemClock,
  ids: systemIds,
  tzOffset: currentTzOffset,
};
