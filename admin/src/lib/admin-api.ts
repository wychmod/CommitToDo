import { AdminConfigError, adminFunctionName, getCloudBaseApp } from './cloudbase';
import { fixtureResponse } from './fixture';

export type AdminErrorCode =
  | 'admin_unauthenticated'
  | 'admin_email_unverified'
  | 'admin_forbidden'
  | 'admin_identity_unresolved'
  | 'admin_invalid_action'
  | 'admin_invalid_params'
  | 'admin_table_not_allowed'
  | 'admin_field_not_allowed'
  | 'admin_not_found'
  | 'admin_conflict'
  | 'admin_not_implemented'
  | 'admin_collection_missing'
  | 'admin_metrics_unavailable'
  | 'admin_write_failed'
  | 'admin_network_error'
  | 'admin_unknown';

export class AdminApiError extends Error {
  readonly code: AdminErrorCode;
  readonly status: number;
  readonly retriable: boolean;
  readonly requestId: string;
  readonly details: Record<string, unknown>;

  constructor(
    code: AdminErrorCode,
    message: string,
    status = 0,
    retriable = false,
    requestId = '',
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
    this.retriable = retriable;
    this.requestId = requestId;
    this.details = details;
  }
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
  status?: number;
  retriable?: boolean;
  requestId?: string;
  serverTime?: number;
  field?: string;
  expectedRev?: number;
  currentRev?: number;
}

interface CallFunctionResponse<T> {
  result?: ApiEnvelope<T>;
  error?: { message?: string };
  requestId?: string;
}

export interface TableMeta {
  name: string;
  label: string;
  read: boolean;
  write: boolean;
  writableFields: string[];
  timeField?: string;
  ready: boolean;
}

export interface TableListData {
  tables: TableMeta[];
}

export interface TableRowsData {
  rows: Record<string, unknown>[];
  nextCursor: string | null;
  maskedFields: string[];
  note?: string;
  sample?: boolean;
}

export interface TableRowData {
  row: Record<string, unknown>;
  maskedFields: string[];
}

export interface MetricItem {
  key: string;
  label: string;
  value: number | null;
  status: 'ready' | 'not_ready' | 'insufficient';
  source: string;
  note?: string;
}

export type MetricStatus = 'ready' | 'not_ready' | 'insufficient';

export interface OverviewPoint {
  date: string;
  active: number;
  signups: number;
  compare?: number | null;
}

export interface RetentionStat {
  day: number;
  value: number | null;
  status: MetricStatus;
}

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
  matured?: boolean;
}

export interface RetentionBlock {
  mode: 'exact';
  status: MetricStatus;
  stats: RetentionStat[];
  cohorts: RetentionCohort[];
}

export interface SyncBlock {
  status: MetricStatus;
  successRate: number | null;
  total: number | null;
  success: number | null;
  conflict: number | null;
  failed: number | null;
  devices: number | null;
}

export interface BackupBlock {
  status: MetricStatus;
  success: number | null;
  failure: number | null;
}

export interface CommitsBlock {
  status: MetricStatus;
  activeUsers: number | null;
  total: number | null;
  points: { date: string; value: number }[];
}

export interface UsageCount {
  event: string;
  label: string;
  value: number | null;
  implemented?: boolean;
}

export interface UsageBlock {
  status: MetricStatus;
  counts: UsageCount[];
  missing?: string[];
  note: string;
}

export interface FunnelStep {
  key: string;
  label: string;
  users: number;
  rate: number | null;
}

export interface FunnelBlock {
  status: MetricStatus;
  cohortSource: 'account.signup' | 'user_first_seen' | null;
  cohort: number;
  windowDays: number;
  steps: FunnelStep[];
  strictUsers: number | null;
  strictRate: number | null;
  note: string;
}

export interface MetricsOverviewData {
  range: { from: string; to: string; timezone: string; tzOffset: number };
  availability: { opsEvents: boolean; userFirstSeen: boolean; commits?: boolean };
  metrics: MetricItem[];
  series: OverviewPoint[] | null;
  retention: RetentionBlock;
  sync: SyncBlock;
  backup: BackupBlock;
  commits: CommitsBlock;
  usage: UsageBlock;
  funnel: FunnelBlock;
  notes: string[];
  sample?: boolean;
}

export interface TableUpdateData {
  row: Record<string, unknown>;
  auditId: string;
}

export interface AuditRow {
  _id?: string;
  actorEmail?: string;
  action?: string;
  collection?: string;
  docId?: string;
  ownerId?: string | null;
  changedFields?: string[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  beforeAbsent?: string[];
  revBefore?: number;
  revAfter?: number;
  reason?: string;
  at?: number;
  status?: string;
}

export interface AuditListData {
  rows: AuditRow[];
  nextCursor: string | null;
  sample?: boolean;
}

export interface WhoAmI {
  uid: string;
  email: string;
  role: 'admin';
}

export async function callAdminApi<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const fixture = fixtureResponse<T>(action, params);
  if (fixture) {
    if (fixture.kind === 'error') {
      throw new AdminApiError(
        fixture.code as AdminErrorCode,
        fixture.message,
        fixture.status,
        false,
        'fixture-request',
      );
    }
    return fixture.data;
  }

  let app;
  try {
    app = getCloudBaseApp();
  } catch (error) {
    if (error instanceof AdminConfigError) {
      throw new AdminApiError('admin_network_error', 'cloud.not_configured');
    }
    throw error;
  }

  let response: CallFunctionResponse<T>;
  try {
    response = (await app.callFunction({
      name: adminFunctionName(),
      data: { action, ...params },
    })) as CallFunctionResponse<T>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AdminApiError('admin_network_error', message, 0, true);
  }

  if (response.error) {
    throw new AdminApiError(
      'admin_network_error',
      response.error.message || '云函数调用失败',
      0,
      true,
      response.requestId || '',
    );
  }

  const payload = response.result;
  if (!payload) {
    throw new AdminApiError(
      'admin_network_error',
      '云函数没有返回内容，可能尚未部署',
      0,
      true,
      response.requestId || '',
    );
  }
  if (payload.ok !== true) {
    const code = (payload.code || 'admin_unknown') as AdminErrorCode;
    const details: Record<string, unknown> = {};
    if (payload.field) details.field = payload.field;
    if (payload.expectedRev != null) details.expectedRev = payload.expectedRev;
    if (payload.currentRev != null) details.currentRev = payload.currentRev;
    throw new AdminApiError(
      code,
      payload.message || '管理接口返回失败',
      payload.status || 0,
      Boolean(payload.retriable),
      payload.requestId || response.requestId || '',
      details,
    );
  }

  return payload.data as T;
}

export function isApiError(error: unknown): error is AdminApiError {
  return error instanceof AdminApiError;
}

export function errorMessage(error: unknown): string {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
