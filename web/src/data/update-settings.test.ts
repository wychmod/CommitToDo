import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import type { WriteDeps } from './deps';
import { updateSettings } from './update-settings';

/**
 * 偏好写入的事务一致性（M01 OP-03–OP-05）。
 *
 * `settings` 单行与 `settings.update` 事件同事务写入；事件写失败必须整体回滚，
 * 不允许出现「偏好改了但没有审计」或「审计写了但偏好没改」。
 */

const AT = Date.UTC(2026, 10, 20, 8, 42);

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  return {
    clock: { now: () => AT },
    ids: { ulid: (now: number) => `ulid-${now}` },
    tzOffset: () => 480,
    ...over,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('updateSettings', () => {
  it('空库首次写入时按默认值补全单行，并记一条 settings.update', async () => {
    const result = await updateSettings({ theme: 'dark' }, makeDeps());
    expect(result.ok).toBe(true);

    const row = await db.settings.get('app');
    expect(row).toMatchObject({
      id: 'app',
      ownerId: 'local',
      theme: 'dark',
      treeDensity: 'comfortable',
      annotations: 'once',
      rev: 1,
      updatedAt: AT,
    });

    const events = await db.events.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      entityType: 'settings',
      entityId: 'app',
      action: 'settings.update',
      payload: { fields: ['theme'] },
      at: AT,
      tzOffset: 480,
    });
  });

  it('连续修改只递增 rev，保留未改字段', async () => {
    await updateSettings({ theme: 'dark' }, makeDeps());
    const second = await updateSettings(
      { treeDensity: 'compact', annotations: 'always' },
      makeDeps({ clock: { now: () => AT + 1000 } }),
    );
    expect(second.ok).toBe(true);

    const row = await db.settings.get('app');
    expect(row).toMatchObject({
      theme: 'dark',
      treeDensity: 'compact',
      annotations: 'always',
      rev: 2,
      updatedAt: AT + 1000,
    });
    expect(await db.events.count()).toBe(2);
  });

  it('回顾提醒开关按布尔值写入并记录字段', async () => {
    const result = await updateSettings({ reminderEnabled: false }, makeDeps());
    expect(result.ok).toBe(true);
    expect(await db.settings.get('app')).toMatchObject({ reminderEnabled: false, rev: 1 });
    expect(await db.events.toArray()).toHaveLength(1);
    expect((await db.events.toArray())[0]?.payload).toEqual({ fields: ['reminderEnabled'] });
  });

  it('非法取值被拒，不写偏好也不写事件', async () => {
    const result = await updateSettings({ theme: 'system' as never }, makeDeps());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'validation.invalid_input', field: 'theme' });
    }
    expect(await db.settings.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
  });

  it('事件写入失败时偏好一起回滚', async () => {
    const result = await updateSettings(
      { annotations: 'off' },
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('id source failed');
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'storage.write_failed', retriable: true });
    }
    expect(await db.settings.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
  });
});
