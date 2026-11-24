import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import type { Device } from './types';

/**
 * 本机设备标识与设备行（PRD V2-02 OP-06）。
 *
 * 设备 ID 只用于区分设备与更新最近同步时间，不进匿名统计的业务内容；
 * 名称与平台仅展示，不上报标题、分支名等内容。
 */

const DEVICE_STORAGE_KEY = 'committodo.device';

export function getDeviceId(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (stored) return stored;
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `device-${Date.now().toString(36)}`;
    window.localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  } catch {
    return 'device-local';
  }
}

export function detectPlatform(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const declared = nav.userAgentData?.platform;
  if (declared) return declared;
  const ua = nav.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Web';
}

/**
 * 当前设备始终可见：登录取代 `ownerId` 后保留原 `createdAt`。
 *
 * 时间从注入的 `clock` 取（而不是直接 `Date.now()`），与其它用例保持同一套
 * 可复现时钟；不传时走系统时钟。
 */
export async function ensureCurrentDevice(
  ownerId: string,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Device> {
  const id = getDeviceId();
  const existing = await db.devices.get(id);
  const at = deps.clock.now();
  if (existing) {
    if (existing.ownerId !== ownerId) {
      const next: Device = { ...existing, ownerId };
      await db.devices.put(next);
      return next;
    }
    return existing;
  }
  const platform = detectPlatform();
  const created: Device = {
    id,
    ownerId,
    label: `${platform} 设备`,
    platform,
    lastSyncAt: null,
    createdAt: at,
    removedAt: null,
  };
  await db.devices.add(created);
  return created;
}

export async function markDeviceSynced(
  ownerId: string,
  at: number,
  deps: WriteDeps = defaultWriteDeps,
): Promise<void> {
  const id = getDeviceId();
  const existing = await db.devices.get(id);
  if (!existing) {
    await ensureCurrentDevice(ownerId, deps);
  }
  await db.devices.update(id, { ownerId, lastSyncAt: at });
}

/** 云端设备列表落地；`removedAt` 保留但界面不消费。 */
export async function replaceRemoteDevices(
  ownerId: string,
  devices: readonly Device[],
): Promise<void> {
  if (devices.length === 0) return;
  await db.transaction('rw', [db.devices], async () => {
    for (const device of devices) {
      if (!device.id) continue;
      const existing = await db.devices.get(device.id);
      await db.devices.put({ ...device, ownerId: existing?.ownerId ?? ownerId });
    }
  });
}
