/**
 * 设备列表排序与超期标注（PRD V2-02 OP-06 / §8.2）。
 *
 * 当前设备固定第一行；其他设备按最近同步时间倒序，最近同步超过 7 天标注提示。
 * `removedAt` 保留字段但本期不消费，已移除的设备不进入列表。
 */

export const DEVICE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SyncDeviceRow {
  id: string;
  label: string;
  platform: string;
  lastSyncAt: number | null;
  createdAt: number;
  removedAt: number | null;
}

export interface DeviceListItem extends SyncDeviceRow {
  isCurrent: boolean;
  /** 其他设备超过 7 天未同步；当前设备恒为 false。 */
  stale: boolean;
}

export interface DeviceListInput {
  currentDeviceId: string | null;
  devices: readonly SyncDeviceRow[];
  now: number;
}

function lastActiveAt(device: SyncDeviceRow): number {
  return device.lastSyncAt ?? device.createdAt;
}

export function buildDeviceList(input: DeviceListInput): DeviceListItem[] {
  const live = input.devices.filter((device) => device.removedAt === null);
  const current = input.currentDeviceId
    ? (live.find((device) => device.id === input.currentDeviceId) ?? null)
    : null;

  const others = live
    .filter((device) => device.id !== current?.id)
    .slice()
    .sort(
      (left, right) => lastActiveAt(right) - lastActiveAt(left) || left.id.localeCompare(right.id),
    );

  const rows: DeviceListItem[] = [];
  if (current) {
    rows.push({
      ...current,
      isCurrent: true,
      stale: false,
    });
  }
  for (const device of others) {
    rows.push({
      ...device,
      isCurrent: false,
      stale: input.now - lastActiveAt(device) > DEVICE_STALE_MS,
    });
  }
  return rows;
}
