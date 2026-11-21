import type { Transaction } from 'dexie';
import { LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import type { EventAction, EventPayloads } from './event-payloads';
import type { EventRecord } from './types';

/**
 * `events` 的唯一写入口（docs/CODE-STRUCTURE.md §4）。
 *
 * 只允许在用例的事务内调用：`await writeEvent(tx, action, entityId, payload)`。
 * 事件写失败必须让事务整体回滚，不捕获、不吞掉。
 */

const ENTITIES = ['branch', 'task', 'commit', 'milestone', 'badge', 'settings'] as const;

type EventEntity = (typeof ENTITIES)[number];

function entityOf(action: EventAction): EventEntity {
  const prefix = action.slice(0, action.indexOf('.'));
  const hit = ENTITIES.find((entity) => entity === prefix);
  if (!hit) {
    throw new Error(`未知的 events action 前缀：${action}`);
  }
  return hit;
}

export async function writeEvent<A extends EventAction>(
  tx: Transaction,
  action: A,
  entityId: string,
  payload: EventPayloads[A],
  deps: WriteDeps = defaultWriteDeps,
): Promise<string> {
  const at = deps.clock.now();
  const id = deps.ids.ulid(at);
  const row: EventRecord = {
    id,
    ownerId: LOCAL_OWNER_ID,
    entityType: entityOf(action),
    entityId,
    action,
    // EventRecord.payload 是 Record<string, unknown>，具体形状由 EventPayloads 约束。
    payload: payload as Record<string, unknown>,
    at,
    tzOffset: deps.tzOffset(at),
    deviceId: null,
  };
  await tx.table<EventRecord, string>('events').add(row);
  return id;
}
