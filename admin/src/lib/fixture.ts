import type {
  MetricsOverviewData,
  TableMeta,
  WhoAmI,
} from './admin-api';
import { tableLabels } from '@/i18n';

/**
 * 仅开发环境使用的像素核对数据层。
 * 通过 `?fixture=ready|forbidden|unverified|identity_error|signed_out` 启用；
 * 生产构建里 DEV 为 false，函数直接返回 null，不改变线上行为。
 */
export type FixtureState = 'ready' | 'forbidden' | 'unverified' | 'identity_error' | 'signed_out';

const FIXTURE_STATES: FixtureState[] = [
  'ready',
  'forbidden',
  'unverified',
  'identity_error',
  'signed_out',
];

const FIXTURE_EMAIL = 'admin@example.com';

export function fixtureState(): FixtureState | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('fixture');
  return value && FIXTURE_STATES.includes(value as FixtureState) ? (value as FixtureState) : null;
}

export function fixtureEmail(): string {
  return FIXTURE_EMAIL;
}

export function fixtureWhoAmI(): WhoAmI {
  return { uid: 'u_demo_admin', email: FIXTURE_EMAIL, role: 'admin' };
}

type FixtureResult<T> =
  | { kind: 'data'; data: T }
  | { kind: 'error'; code: string; message: string; status: number };

const READY_TABLES = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
  'settings',
  'year_reviews',
  'users',
  'devices',
  'events',
  'backups',
  'outbox',
  'conflicts',
  'migration_state',
  'counters',
  'admin_audit_log',
];

const NOT_READY_TABLES = ['ops_events', 'user_first_seen'];

const WRITABLE_TABLES = new Set([
  'branches',
  'tasks',
  'commits',
  'milestones',
  'settings',
  'year_reviews',
]);

function tableMeta(name: string): TableMeta {
  return {
    name,
    label: tableLabels[name] || name,
    read: true,
    write: WRITABLE_TABLES.has(name),
    writableFields: [],
    ready: READY_TABLES.includes(name),
  };
}

const TABLE_LIST: TableMeta[] = [
  ...READY_TABLES.slice(0, 2),
  ...NOT_READY_TABLES.slice(0, 1),
  ...READY_TABLES.slice(2),
  ...NOT_READY_TABLES.slice(1),
].map(tableMeta);

const BRANCH_ROWS: Record<string, unknown>[] = [
  {
    _id: 'br_demo_018',
    ownerId: 'u_demo_02',
    title: '产品设计',
    status: 'active',
    rev: 7,
    updatedAt: '2026-11-22 10:42',
  },
  {
    _id: 'br_demo_017',
    ownerId: 'u_demo_02',
    title: '页面调研',
    status: 'active',
    rev: 3,
    updatedAt: '2026-11-22 09:18',
  },
  {
    _id: 'br_demo_016',
    ownerId: 'u_demo_05',
    title: '跑步',
    status: 'active',
    rev: 2,
    updatedAt: '2026-11-21 21:06',
  },
  {
    _id: 'br_demo_015',
    ownerId: 'u_demo_03',
    title: '阅读',
    status: 'active',
    rev: 5,
    updatedAt: '2026-11-21 18:32',
  },
  {
    _id: 'br_demo_014',
    ownerId: 'u_demo_02',
    title: '每周回顾',
    status: 'archived',
    rev: 9,
    updatedAt: '2026-11-20 22:14',
  },
  {
    _id: 'br_demo_013',
    ownerId: 'u_demo_04',
    title: '晨间计划',
    status: 'active',
    rev: 1,
    updatedAt: '2026-11-20 07:05',
  },
];

const AUDIT_ROWS = [
  ['au_demo_01', '2026-11-22T14:26:17+08:00', 'branches', 'br_8c42', ['title', 'color']],
  ['au_demo_02', '2026-11-22T11:03:09+08:00', 'tasks', 'tk_415c', ['title', 'note']],
  ['au_demo_03', '2026-11-22T10:47:33+08:00', 'milestones', 'ms_713e', ['title', 'note']],
  ['au_demo_04', '2026-11-22T09:15:02+08:00', 'settings', 'st_71ac', ['theme']],
  ['au_demo_05', '2026-11-21T16:58:27+08:00', 'commits', 'cm_a21f', ['summary']],
  ['au_demo_06', '2026-11-21T14:22:41+08:00', 'tasks', 'tk_415c', ['note']],
  ['au_demo_07', '2026-11-21T10:06:19+08:00', 'branches', 'br_8c42', ['title', 'goal']],
].map(([id, at, collection, docId, changedFields]) => ({
  _id: id as string,
  actorEmail: FIXTURE_EMAIL,
  action: 'admin.update',
  collection: collection as string,
  docId: docId as string,
  changedFields: changedFields as string[],
  at: new Date(at as string).getTime(),
  status: 'applied',
}));

function metricsOverview(): MetricsOverviewData {
  const metric = (key: string, label: string, source: string) => ({
    key,
    label,
    value: null,
    status: 'not_ready' as const,
    source,
  });
  return {
    range: { from: '2026-11-16', to: '2026-11-22', timezone: 'Asia/Shanghai', tzOffset: 480 },
    availability: { opsEvents: false, userFirstSeen: false },
    metrics: [
      metric('dau', '日活账号', 'ops_events'),
      metric('wau', '周活账号', 'ops_events'),
      metric('mau', '月活账号', 'ops_events'),
      metric('newUsers', '注册数', 'users'),
      metric('retentionD1', 'D1 留存', 'user_first_seen'),
      metric('retentionD7', 'D7 留存', 'user_first_seen'),
    ],
    notes: [],
  };
}

export function fixtureResponse<T>(
  action: string,
  params: Record<string, unknown>,
): FixtureResult<T> | null {
  if (!fixtureState()) return null;

  if (action === 'tables.list') {
    return { kind: 'data', data: { tables: TABLE_LIST } as unknown as T };
  }

  if (action === 'tables.rows') {
    const collection = String(params.collection || '');
    if (collection === 'ops_events' || collection === 'user_first_seen') {
      return {
        kind: 'error',
        code: 'admin_collection_missing',
        message: `云端尚未创建 ${collection}`,
        status: 503,
      };
    }
    const ownerId = typeof params.ownerId === 'string' ? params.ownerId : '';
    const rows = ownerId ? [] : BRANCH_ROWS;
    return {
      kind: 'data',
      data: { rows, nextCursor: null, maskedFields: [] } as unknown as T,
    };
  }

  if (action === 'metrics.overview') {
    return { kind: 'data', data: metricsOverview() as unknown as T };
  }

  if (action === 'audit.list') {
    return {
      kind: 'data',
      data: { rows: AUDIT_ROWS, nextCursor: null } as unknown as T,
    };
  }

  if (action === 'whoami') {
    return { kind: 'data', data: fixtureWhoAmI() as unknown as T };
  }

  return null;
}
