import type {
  MetricItem,
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
  ['au_demo_01', '2026-11-22T14:26:17+08:00', 'branches', 'br_demo_016', ['title'], { title: '晨跑' }, { title: '跑步' }],
  ['au_demo_02', '2026-11-22T11:03:09+08:00', 'tasks', 'tk_415c', ['title', 'note'], null, null],
  ['au_demo_03', '2026-11-22T10:47:33+08:00', 'milestones', 'ms_713e', ['title', 'note'], null, null],
  ['au_demo_04', '2026-11-22T09:15:02+08:00', 'settings', 'st_71ac', ['theme'], null, null],
  ['au_demo_05', '2026-11-21T16:58:27+08:00', 'commits', 'cm_a21f', ['summary'], null, null],
  ['au_demo_06', '2026-11-21T14:22:41+08:00', 'tasks', 'tk_415c', ['note'], null, null],
  ['au_demo_07', '2026-11-21T10:06:19+08:00', 'branches', 'br_demo_017', ['title', 'goal'], { title: '页面调研' }, { title: '页面调研（旧）' }],
].map(([id, at, collection, docId, changedFields, before, after]) => ({
  _id: id as string,
  actorEmail: FIXTURE_EMAIL,
  action: 'admin.update',
  collection: collection as string,
  docId: docId as string,
  changedFields: changedFields as string[],
  before: (before || null) as Record<string, unknown> | null,
  after: (after || null) as Record<string, unknown> | null,
  at: new Date(at as string).getTime(),
  status: 'applied',
}));

function metricsOverview(): MetricsOverviewData {
  const dates = Array.from({ length: 22 }, (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}`);
  const active = [
    112, 116, 114, 118, 121, 119, 124, 122, 126, 129, 127, 131, 134, 132, 136, 139, 137, 141,
    138, 142, 140, 143,
  ];
  const compare = [
    104, 108, 106, 110, 113, 111, 116, 114, 118, 121, 119, 123, 126, 124, 128, 131, 129, 133,
    130, 134, 132, 135,
  ];
  const signups = [
    18, 21, 16, 24, 19, 26, 24, 20, 22, 25, 18, 27, 23, 21, 26, 24, 19, 28, 22, 25, 23, 24,
  ];
  const commits = [
    22, 27, 24, 31, 29, 33, 27, 30, 28, 34, 31, 36, 33, 32, 35, 38, 34, 39, 36, 38, 37, 41,
  ];
  const empty = new URLSearchParams(window.location.search).get('metrics') === 'empty';

  const metric = (
    key: string,
    label: string,
    value: number | null,
    source: string,
    status: MetricItem['status'] = 'ready',
  ): MetricItem => ({ key, label, value, status, source });

  if (empty) {
    const notReady = (key: string, label: string, source: string) =>
      metric(key, label, null, source, 'not_ready');
    return {
      range: { from: dates[0], to: dates[6], timezone: 'Asia/Shanghai', tzOffset: 480 },
      availability: { opsEvents: false, userFirstSeen: false, commits: false },
      metrics: [
        notReady('dau', '日活账号', 'ops_events'),
        notReady('dauDevice', '日活设备', 'ops_events'),
        notReady('wau', '周活账号', 'ops_events'),
        notReady('mau', '月活账号', 'ops_events'),
        notReady('newUsers', '注册数', 'user_first_seen'),
        notReady('retentionD1', 'D1 留存', 'user_first_seen'),
        notReady('retentionD7', 'D7 留存', 'user_first_seen'),
      ],
      series: null,
      retention: {
        mode: 'exact',
        status: 'not_ready',
        stats: [1, 7, 30].map((day) => ({ day, value: null, status: 'not_ready' as const })),
        cohorts: [],
      },
      sync: {
        status: 'not_ready',
        successRate: null,
        total: null,
        success: null,
        conflict: null,
        failed: null,
        devices: null,
      },
      backup: { status: 'not_ready', success: null, failure: null },
      commits: { status: 'not_ready', activeUsers: null, total: null, points: [] },
      notes: [],
      sample: false,
    };
  }

  return {
    range: { from: dates[0], to: dates[6], timezone: 'Asia/Shanghai', tzOffset: 480 },
    availability: { opsEvents: true, userFirstSeen: true, commits: true },
    metrics: [
      metric('dau', '日活账号', 128, 'ops_events'),
      metric('dauDevice', '日活设备', 156, 'ops_events'),
      metric('wau', '周活账号', 642, 'ops_events'),
      metric('mau', '月活账号', 1286, 'ops_events'),
      metric('newUsers', '注册数', 24, 'user_first_seen'),
      metric('retentionD1', 'D1 留存', 42, 'user_first_seen'),
      metric('retentionD7', 'D7 留存', 26, 'user_first_seen'),
      metric('retentionD30', 'D30 留存', null, 'user_first_seen', 'insufficient'),
      metric('syncDevices', '同步设备', 58, 'ops_events'),
      metric('syncSuccess', '同步成功率', 98.4, 'ops_events'),
      metric('backupSuccess', '备份成功', 36, 'ops_events'),
      metric('backupFailed', '备份失败', 2, 'ops_events'),
      metric('commitUsers', '有效提交账号', 64, 'commits'),
      metric('commitCount', '有效提交', 193, 'commits'),
      metric('branchNew', '新建分支', 9, 'branches'),
    ],
    series: dates.map((date, index) => ({
      date,
      active: active[index],
      signups: signups[index],
      compare: compare[index],
    })),
    retention: {
      mode: 'exact',
      status: 'ready',
      stats: [
        { day: 1, value: 42, status: 'ready' },
        { day: 7, value: 26, status: 'ready' },
        { day: 30, value: null, status: 'insufficient' },
      ],
      cohorts: [
        { cohortDate: '2026-11-08', cohortSize: 216, d1: 44, d7: 27, d30: null, matured: true },
        { cohortDate: '2026-11-10', cohortSize: 208, d1: 41, d7: 25, d30: null, matured: true },
        { cohortDate: '2026-11-13', cohortSize: 218, d1: 40, d7: 26, d30: null, matured: true },
      ],
    },
    sync: {
      status: 'ready',
      successRate: 98.4,
      total: 61,
      success: 60,
      conflict: 1,
      failed: 0,
      devices: 58,
    },
    backup: { status: 'ready', success: 36, failure: 2 },
    commits: {
      status: 'ready',
      activeUsers: 64,
      total: 193,
      points: dates.map((date, index) => ({ date, value: commits[index] })),
    },
    notes: [],
    sample: true,
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
      data: { rows, nextCursor: null, maskedFields: [], sample: true } as unknown as T,
    };
  }

  if (action === 'tables.row') {
    const id = String(params.id || '');
    const row = BRANCH_ROWS.find((item) => item._id === id);
    if (!row) {
      return { kind: 'error', code: 'admin_not_found', message: '该行不存在', status: 404 };
    }
    return { kind: 'data', data: { row, maskedFields: [] } as unknown as T };
  }

  if (action === 'tables.update') {
    const id = String(params.id || '');
    const expectedRev = Number(params.expectedRev);
    const reason = String(params.reason || '').trim();
    const patch = (params.patch && typeof params.patch === 'object' ? params.patch : null) as Record<
      string,
      unknown
    > | null;
    if (!patch || !Object.keys(patch).length) {
      return { kind: 'error', code: 'admin_invalid_params', message: 'patch 不能为空', status: 400 };
    }
    if (!reason) {
      return { kind: 'error', code: 'admin_invalid_params', message: 'reason 必填', status: 400 };
    }
    const row = BRANCH_ROWS.find((item) => item._id === id);
    if (!row) {
      return { kind: 'error', code: 'admin_not_found', message: '该行不存在', status: 404 };
    }
    const currentRev = Number(row.rev || 0);
    if (currentRev !== expectedRev) {
      return {
        kind: 'error',
        code: 'admin_conflict',
        message: `记录已被更新：编辑版本 rev ${expectedRev}，最新版本 rev ${currentRev}。请刷新后重试。`,
        status: 409,
      };
    }
    const nextRev = currentRev + 1;
    Object.assign(row, patch, { rev: nextRev, updatedAt: '2026-11-22 15:04' });
    return {
      kind: 'data',
      data: { row: { ...row }, auditId: `au_fixture_${nextRev}` } as unknown as T,
    };
  }

  if (action === 'metrics.overview') {
    return { kind: 'data', data: metricsOverview() as unknown as T };
  }

  if (action === 'audit.list') {
    return {
      kind: 'data',
      data: { rows: AUDIT_ROWS, nextCursor: null, sample: true } as unknown as T,
    };
  }

  if (action === 'whoami') {
    return { kind: 'data', data: fixtureWhoAmI() as unknown as T };
  }

  return null;
}
