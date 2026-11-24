import type { Transaction } from 'dexie';
import { recountBranch } from '@/core/rules/counters';
import type { WriteDeps } from './deps';
import { enqueueEntityWrite } from './outbox';
import { branchRepository, commitRepository, taskRepository } from './repositories';

/**
 * 同事务重算分支四计数（R7）。
 *
 * 完成、取消、改归属都在写入任务行之后调用；读取发生在同一事务内，
 * 能看到刚写入的待办与提交，避免增量计数漂移。
 *
 * 计数写回会把 `branches.rev` 加一，因此这里必须同时入队一条 branch 快照：
 * 否则本地 `rev` 领先服务端多格，该行之后的推送全部被判成过期写入，
 * 本地改动会被服务端旧版本覆盖（见 `outbox.ts` 的不变量说明）。
 */
export async function syncBranchCounts(
  tx: Transaction,
  branchId: string,
  deps: WriteDeps,
): Promise<void> {
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
  // 计数是派生字段，服务端不重算；推一条 branch.counts 让远端跟上这一版 rev。
  await enqueueEntityWrite(tx, 'branch', branchId, 'branch.counts', { branchId, ...counts }, deps);
}
