import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { normalizeAnnotationMode } from '@/core/rules/annotation-visibility';
import { normalizeTheme } from '@/core/rules/theme-preference';
import { resolveTreeDensity } from '@/core/rules/tree-density';
import { db, LOCAL_OWNER_ID } from './db';
import { DEFAULT_SETTINGS, type SettingsFields } from './settings-defaults';
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

/**
 * 偏好读数。`loaded = false` 表示查询尚未完成；行不存在时按默认值返回并视为已加载，
 * 这样设置页不会把「首次使用」误判为加载中，也不会在读到旧行时闪烁。
 */
export function useSettingsState(ownerId = LOCAL_OWNER_ID) {
  const row = useLiveQuery(async () => {
    try {
      return (await settingsRepository.getByOwner(ownerId)) ?? null;
    } catch {
      // 读取失败由工作区外壳的错误态统一承接；这里回落默认偏好，避免整页白屏。
      return null;
    }
  }, [ownerId]);

  const settings: SettingsFields = {
    theme: normalizeTheme(row?.theme),
    treeDensity: resolveTreeDensity(row?.treeDensity).density,
    annotations: normalizeAnnotationMode(row?.annotations),
    reminderEnabled: row?.reminderEnabled ?? DEFAULT_SETTINGS.reminderEnabled,
    lastAutoBackupAt: row?.lastAutoBackupAt ?? null,
  };

  return { loaded: row !== undefined, settings };
}

export function useRecentEvents(ownerId = LOCAL_OWNER_ID, limit = 20) {
  return useLiveQuery(() => eventRepository.listRecent(ownerId, limit), [ownerId, limit]);
}

export type StorageStatus = 'checking' | 'ready' | 'error';

/**
 * 本机库可用性（M01 OP-08）。
 *
 * 打开工作区时先探测一次 `db.open()`；失败时外壳保留顶栏与导航，
 * 主区显示可读原因与「重试」，不清空、不新建空库覆盖已有数据。
 */
export function useStorageReady() {
  const [status, setStatus] = useState<StorageStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('checking');

    void (async () => {
      try {
        await db.open();
        if (active) setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    status,
    retry: () => setAttempt((value) => value + 1),
  };
}
