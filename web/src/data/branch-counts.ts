import { recountBranch } from '@/core/rules/counters';
import type { WriteDeps } from './deps';
import { branchRepository, commitRepository, taskRepository } from './repositories';

/**
 * 同事务重算分支四计数（R7）。
 *
 * 完成、取消、改归属都在写入任务行之后调用；读取发生在同一事务内，
 * 能看到刚写入的待办与提交，避免增量计数漂移。
 */
export async function syncBranchCounts(branchId: string, deps: WriteDeps): Promise<void> {
  const branch = await branchRepository.getById(branchId);
  if (!branch) return;

  const [tasks, commits] = await Promise.all([
    taskRepository.listByBranch(branchId),
    commitRepository.listByBranch(branchId),
  ]);
  const counts = recountBranch(branchId, tasks, commits);

  await branchRepository.put({
    ...branch,
    ...counts,
    rev: branch.rev + 1,
    updatedAt: deps.clock.now(),
  });
}
