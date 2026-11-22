import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/core/errors';
import type { PullChange, PullResponse } from './cloud/sync';
import { db, LOCAL_OWNER_ID } from './db';
import type { WriteDeps } from './deps';
import { applyPullChanges, pullOnce, readPullCursor } from './sync-pull';
import { createPullLoop } from './sync-pull-loop';
import type { Branch, OutboxOp } from './types';

/**
 * 入站同步的可复现证据（PRD V2-02 方案 B）。
 *
 * 覆盖：远端变更落地、本设备行跳过、冲突沿用补推判定（conflicts + sync.conflict）、
 * 同页幂等、失败保留游标、3 秒轮询与失败退避。
 */

const AT = Date.UTC(2026, 10, 22, 2, 0);
const OWNER = 'owner-1';

function makeDeps(): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `id-${++seq}` },
    tzOffset: () => 480,
  };
}

function branchRow(over: Partial<Branch> & Record<string, unknown> = {}): Branch {
  return {
    id: 'b1',
    ownerId: LOCAL_OWNER_ID,
    parentId: null,
    path: '/',
    depth: 0,
    title: '我',
    goal: null,
    color: 'coral',
    status: 'active',
    order: 0,
    archivedAt: null,
    finishedAt: null,
    finishedIntoId: null,
    droppedAt: null,
    dropReason: null,
    pinnedAt: null,
    taskTotal: 0,
    taskDone: 0,
    commitCount: 0,
    ownLastCommitAt: null,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  } as Branch;
}

function changeOf(row: Branch): PullChange {
  return {
    entity: 'branch',
    collection: 'branches',
    row: row as unknown as Record<string, unknown>,
  };
}

function pendingOp(payload: Branch): OutboxOp {
  return {
    opId: 'op-1',
    entity: 'branch',
    entityId: payload.id,
    action: 'branch.rename',
    payload: payload as unknown as Record<string, unknown>,
    baseRev: 1,
    attempts: 0,
    lastError: null,
    createdAt: AT,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
  vi.stubGlobal('navigator', { userAgent: 'node', onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('applyPullChanges', () => {
  it('本机没有该行时直接落地服务端版本', async () => {
    const summary = await applyPullChanges(
      [changeOf(branchRow({ title: '远端', rev: 3, lastDeviceId: 'other' }))],
      'this-device',
      makeDeps(),
    );
    expect(summary).toMatchObject({ applied: 1, conflicts: 0, skipped: 0 });
    expect((await db.branches.get('b1'))?.title).toBe('远端');
  });

  it('本机版本不比服务端旧时跳过，不覆盖本地', async () => {
    await db.branches.put(branchRow({ title: '本地', rev: 3 }));
    const summary = await applyPullChanges(
      [changeOf(branchRow({ title: '远端', rev: 3, lastDeviceId: 'other' }))],
      'this-device',
      makeDeps(),
    );
    expect(summary).toMatchObject({ applied: 0, conflicts: 0, skipped: 1 });
    expect((await db.branches.get('b1'))?.title).toBe('本地');
  });

  it('跳过本设备刚推上去的行', async () => {
    await db.branches.put(branchRow({ title: '本地', rev: 1 }));
    const summary = await applyPullChanges(
      [changeOf(branchRow({ title: '本机云端版本', rev: 2, lastDeviceId: 'this-device' }))],
      'this-device',
      makeDeps(),
    );
    expect(summary).toMatchObject({ applied: 0, conflicts: 0, skipped: 1 });
    expect((await db.branches.get('b1'))?.title).toBe('本地');
  });

  it('本机未提交改动遇到更新的服务端版本：记冲突、留事件并采用服务端版本', async () => {
    const local = branchRow({ title: '本地', rev: 1 });
    await db.branches.put(local);
    await db.outbox.add(pendingOp(local));

    const summary = await applyPullChanges(
      [changeOf(branchRow({ title: '服务端', rev: 2, lastDeviceId: 'other-device' }))],
      'this-device',
      makeDeps(),
    );

    expect(summary).toMatchObject({ applied: 0, conflicts: 1, skipped: 0 });
    const conflict = (await db.conflicts.toArray())[0];
    expect(conflict).toMatchObject({
      entity: 'branch',
      entityId: 'b1',
      branchId: 'b1',
      deviceId: 'this-device',
      localRev: 1,
      serverRev: 2,
    });
    const event = (await db.events.toArray()).find((row) => row.action === 'sync.conflict');
    expect(event?.payload).toMatchObject({
      entity: 'branch',
      entityId: 'b1',
      deviceId: 'this-device',
    });

    expect((await db.branches.get('b1'))?.title).toBe('服务端');
    expect((await db.branches.get('b1'))?.rev).toBe(2);
    expect(await db.outbox.count()).toBe(0);
  });

  it('同一页重复应用不会重复记冲突', async () => {
    const local = branchRow({ title: '本地', rev: 1 });
    await db.branches.put(local);
    await db.outbox.add(pendingOp(local));
    const page = [changeOf(branchRow({ title: '服务端', rev: 2, lastDeviceId: 'other-device' }))];

    await applyPullChanges(page, 'this-device', makeDeps());
    const second = await applyPullChanges(page, 'this-device', makeDeps());

    expect(second).toMatchObject({ applied: 0, conflicts: 0, skipped: 1 });
    expect(await db.conflicts.count()).toBe(1);
    expect(
      (await db.events.toArray()).filter((row) => row.action === 'sync.conflict'),
    ).toHaveLength(1);
  });
});

describe('pullOnce 游标续传', () => {
  it('成功才推进游标；失败保留原游标，恢复后从原位置继续', async () => {
    const seen: Array<string | null> = [];
    const first = await pullOnce(OWNER, async (cursor) => {
      seen.push(cursor);
      return ok<PullResponse>({ changes: [], cursor: 'cursor-1', serverTime: AT });
    });
    expect(first.ok).toBe(true);
    expect(readPullCursor(OWNER)).toBe('cursor-1');

    const failed = await pullOnce(OWNER, async (cursor) => {
      seen.push(cursor);
      return fail('sync.failed', { retriable: true });
    });
    expect(failed.ok).toBe(false);
    expect(readPullCursor(OWNER)).toBe('cursor-1');

    await pullOnce(OWNER, async (cursor) => {
      seen.push(cursor);
      return ok<PullResponse>({ changes: [], cursor: 'cursor-2', serverTime: AT });
    });

    expect(seen).toEqual([null, 'cursor-1', 'cursor-1']);
    expect(readPullCursor(OWNER)).toBe('cursor-2');
  });
});

describe('createPullLoop', () => {
  it('默认 3 秒轮询，页面不可见时暂停，恢复立即补一次', async () => {
    vi.useFakeTimers();
    let runs = 0;
    let hidden = false;
    const loop = createPullLoop({
      run: async () => {
        runs += 1;
        return ok(null);
      },
      isHidden: () => hidden,
      setTimer: (callback, ms) => setTimeout(callback, ms) as unknown as number,
      clearTimer: (id) => clearTimeout(id),
    });

    loop.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(runs).toBe(1);

    await vi.advanceTimersByTimeAsync(2_999);
    expect(runs).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(runs).toBe(2);

    hidden = true;
    await vi.advanceTimersByTimeAsync(9_000);
    expect(runs).toBe(2);

    hidden = false;
    loop.poke();
    await vi.advanceTimersByTimeAsync(0);
    expect(runs).toBe(3);

    loop.stop();
  });

  it('连续失败按退避拉长间隔', async () => {
    vi.useFakeTimers();
    let runs = 0;
    const loop = createPullLoop({
      run: async () => {
        runs += 1;
        return fail('sync.failed', { retriable: true });
      },
      setTimer: (callback, ms) => setTimeout(callback, ms) as unknown as number,
      clearTimer: (id) => clearTimeout(id),
    });

    loop.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(runs).toBe(1);

    // 第 1、2 次失败仍按 3 秒（退避未超过轮询间隔），第 3 次起拉长到 4 秒。
    await vi.advanceTimersByTimeAsync(3_000);
    expect(runs).toBe(2);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(runs).toBe(3);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(runs).toBe(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(runs).toBe(4);

    loop.stop();
  });
});
