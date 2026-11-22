import { AdminConfigError, adminFunctionName, getCloudBaseApp } from './cloudbase';

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

  constructor(code: AdminErrorCode, message: string, status = 0, retriable = false, requestId = '') {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
    this.retriable = retriable;
    this.requestId = requestId;
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

export interface MetricsOverviewData {
  range: { from: string; to: string; timezone: string; tzOffset: number };
  availability: { opsEvents: boolean; userFirstSeen: boolean };
  metrics: MetricItem[];
  notes: string[];
}

export interface AuditRow {
  _id?: string;
  actorEmail?: string;
  action?: string;
  collection?: string;
  docId?: string;
  changedFields?: string[];
  at?: number;
  status?: string;
}

export interface AuditListData {
  rows: AuditRow[];
  nextCursor: string | null;
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
    throw new AdminApiError(
      code,
      payload.message || '管理接口返回失败',
      payload.status || 0,
      Boolean(payload.retriable),
      payload.requestId || response.requestId || '',
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
