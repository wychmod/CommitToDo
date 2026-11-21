import { describe, expect, it } from 'vitest';
import { DEVICE_STALE_MS, buildDeviceList, type SyncDeviceRow } from './device-list';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const device = (over: Partial<SyncDeviceRow> = {}): SyncDeviceRow => ({
  id: 'device-a',
  label: 'Windows 设备',
  platform: 'Windows',
  lastSyncAt: NOW - DAY,
  createdAt: NOW - 30 * DAY,
  removedAt: null,
  ...over,
});

describe('设备列表排序与超期标注（V2-02 §8.2）', () => {
  it('当前设备固定第一，其他设备按最近同步时间倒序', () => {
    const rows = buildDeviceList({
      currentDeviceId: 'device-a',
      now: NOW,
      devices: [
        device({ id: 'device-b', lastSyncAt: NOW - 2 * DAY }),
        device({ id: 'device-c', lastSyncAt: NOW - DAY }),
        device({ id: 'device-a', lastSyncAt: NOW - 10 * DAY }),
      ],
    });
    expect(rows.map((row) => row.id)).toEqual(['device-a', 'device-c', 'device-b']);
    expect(rows[0].isCurrent).toBe(true);
  });

  it('同一时间按 id 稳定排序，lastSyncAt 为空时回落到 createdAt', () => {
    const rows = buildDeviceList({
      currentDeviceId: 'device-a',
      now: NOW,
      devices: [
        device({ id: 'device-c', lastSyncAt: null, createdAt: NOW - DAY }),
        device({ id: 'device-b', lastSyncAt: NOW - DAY }),
        device({ id: 'device-a', lastSyncAt: NOW - 30 * DAY }),
      ],
    });
    expect(rows.map((row) => row.id)).toEqual(['device-a', 'device-b', 'device-c']);
  });

  it('恰好 7 天不算超期，超过 1 毫秒才标注', () => {
    const exact = buildDeviceList({
      currentDeviceId: 'device-a',
      now: NOW,
      devices: [
        device({ id: 'device-a' }),
        device({ id: 'device-b', lastSyncAt: NOW - DEVICE_STALE_MS }),
        device({ id: 'device-c', lastSyncAt: NOW - DEVICE_STALE_MS - 1 }),
      ],
    });
    const byId = new Map(exact.map((row) => [row.id, row]));
    expect(byId.get('device-b')?.stale).toBe(false);
    expect(byId.get('device-c')?.stale).toBe(true);
    expect(byId.get('device-a')?.stale).toBe(false);
  });

  it('removedAt 已写入的设备不进入列表，只有当前设备时只返回一行', () => {
    const rows = buildDeviceList({
      currentDeviceId: 'device-a',
      now: NOW,
      devices: [device(), device({ id: 'device-b', removedAt: NOW - DAY })],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('device-a');
  });
});
