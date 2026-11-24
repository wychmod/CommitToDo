import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { systemClock } from '@/core/clock';
import { backoffDelay } from '@/core/rules/sync-backoff';
import { db } from './db';
import { getDeviceId } from './devices';
import type { MigrationProgress } from './migrate';
import { readMigrationProgress, startMigration } from './migrate';
import { startOpsReporting } from './ops-events';
import { isOnline, isSyncing, maxAttempts, runSync, subscribeSyncState } from './sync';
import { startSyncPull } from './sync-pull';

/**
 * 同步状态的读钩子（PRD V2-02 OP-07）。
 *
 * 所有数字都来自本机表；不轮询云端，状态变化由 outbox / conflicts / devices 的
 * live query 就地更新。`useSyncRunner` 只在外壳挂一次，负责在线时自动补推与退避重试。
 */

export function useSyncSnapshot() {
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);
  const conflicts = useLiveQuery(() => db.conflicts.count(), [], 0);
  const attempts = useLiveQuery(() => maxAttempts(), [], 0);
  const devices = useLiveQuery(() => db.devices.toArray(), [], []);
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(isSyncing);

  useEffect(() => subscribeSyncState(setSyncing), []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const currentDeviceId = getDeviceId();
  const currentDevice = devices.find((device) => device.id === currentDeviceId) ?? null;

  return {
    pending,
    conflicts,
    attempts,
    devices,
    currentDeviceId,
    lastSyncAt: currentDevice?.lastSyncAt ?? null,
    online,
    syncing,
    now: systemClock.now(),
  };
}

/** 冲突记录列表（按冲突时间倒序）。 */
export function useSyncConflicts() {
  return useLiveQuery(() => db.conflicts.orderBy('at').reverse().toArray(), [], []);
}

/** 外壳挂载一次：在线且有排队时自动补推；失败按 attempts 指数退避重试。 */
export function useSyncRunner(principalId: string | null): void {
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);
  const attempts = useLiveQuery(() => maxAttempts(), [], 0);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    if (!principalId) return;
    // 行为埋点与同步同生命周期：登录后启动，退出登录后停止（队列保留）。
    return startOpsReporting();
  }, [principalId]);

  useEffect(() => {
    if (!principalId) return;
    // 入站同步：登录后开始游标轮询，卸载时停止；游标保留在本机。
    return startSyncPull(principalId);
  }, [principalId]);

  useEffect(() => {
    if (!principalId || !online || pending === 0) return;
    const delay = attempts > 0 ? backoffDelay(attempts) : 0;
    const timer = window.setTimeout(() => {
      void runSync(principalId);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [principalId, online, pending, attempts]);
}

/** 首次迁移进度与续传（PRD V2-02 OP-05），只在 `/settings#sync` 使用。 */
export function useMigration(principalId: string | null) {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = async () => {
    setProgress(await readMigrationProgress());
  };

  const start = async () => {
    if (!principalId || running) return;
    setRunning(true);
    setError(null);
    const result = await startMigration(principalId);
    setRunning(false);
    await refresh();
    if (!result.ok) setError(result.error.code);
  };

  useEffect(() => {
    void readMigrationProgress().then(setProgress);
    setError(null);
  }, [principalId]);

  return { progress, error, running, start, refresh };
}
