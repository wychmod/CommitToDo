import { useLiveQuery } from 'dexie-react-hooks';
import { LOCAL_OWNER_ID } from './db';
import {
  badgeRepository,
  branchRepository,
  commitRepository,
  eventRepository,
  milestoneRepository,
  settingsRepository,
  taskRepository,
} from './repositories';

/**
 * 读路径统一走 `useLiveQuery`（TECH-ARCHITECTURE.md §2.6 / §5.4）。
 *
 * 返回 `undefined` 表示首次查询尚未完成，页面据此渲染加载态；
 * 空库时返回空数组，不用假数据填充。
 */

export function useBranches(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => branchRepository.listByOwner(ownerId), [ownerId]);
}

export function useBranch(branchId: string | undefined) {
  return useLiveQuery(
    () => (branchId ? branchRepository.getById(branchId) : undefined),
    [branchId],
  );
}

export function useOpenTasks(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => taskRepository.listOpenByOwner(ownerId), [ownerId]);
}

export function useRecentCommits(ownerId = LOCAL_OWNER_ID, limit = 3) {
  return useLiveQuery(() => commitRepository.listRecent(ownerId, limit), [ownerId, limit]);
}

export function useMilestones(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => milestoneRepository.listByOwner(ownerId), [ownerId]);
}

export function useBadges(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => badgeRepository.listByOwner(ownerId), [ownerId]);
}

export function useSettings(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => settingsRepository.getByOwner(ownerId), [ownerId]);
}

export function useRecentEvents(ownerId = LOCAL_OWNER_ID, limit = 20) {
  return useLiveQuery(() => eventRepository.listRecent(ownerId, limit), [ownerId, limit]);
}
