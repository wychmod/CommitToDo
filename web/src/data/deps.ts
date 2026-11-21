import { systemClock, type Clock } from '@/core/clock';
import { systemIds, type IdSource } from '@/core/ids';

/**
 * 用例的写入依赖（docs/CODE-STRUCTURE.md §2）。
 *
 * 用例签名统一为 `useCase(input, deps = defaultWriteDeps)`；
 * 测试传固定时钟与固定 ID，生产走系统实现。
 */
export interface WriteDeps {
  clock: Clock;
  ids: IdSource;
}

export const defaultWriteDeps: WriteDeps = {
  clock: systemClock,
  ids: systemIds,
};
