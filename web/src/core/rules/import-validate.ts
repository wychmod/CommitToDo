/**
 * 导入文件校验（PRD M10 OP-04 / §4.2）。
 *
 * 只做结构与版本判断，不读写库、不改动传入对象：
 * - 缺 `schemaVersion` 或类型不对 → `backup.invalid_file`（field 为 `schemaVersion`）
 * - 版本不是当前版本 → `backup.version_unsupported`
 * - 七张表缺失、不是数组、行不是对象或 id 重复 → `backup.invalid_file`（field 为 `data`）
 *
 * 示例命名空间的行在通过校验后被剔除，不会进入恢复流程。
 */

import { fail, ok, type Result } from '@/core/errors';
import {
  EXPORT_SCHEMA_VERSION,
  EXPORT_TABLES,
  isExampleRecord,
  type ExportCounts,
  type ExportTable,
} from './export-file';

export interface ImportRow {
  id: string;
  ownerId?: string;
  [key: string]: unknown;
}

export type ImportTables = Record<ExportTable, ImportRow[]>;

export interface ImportSummary {
  schemaVersion: number;
  exportedAt: string | null;
  appVersion: string | null;
  counts: ExportCounts;
}

export interface ImportFileData {
  tables: ImportTables;
  summary: ImportSummary;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function emptyTables(): ImportTables {
  return {
    branches: [],
    tasks: [],
    commits: [],
    milestones: [],
    badges: [],
    settings: [],
    events: [],
  };
}

export function validateImportFile(text: string): Result<ImportFileData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return fail('backup.invalid_file', { cause });
  }
  if (!isPlainObject(parsed)) {
    return fail('backup.invalid_file');
  }

  if (!('schemaVersion' in parsed) || parsed.schemaVersion === undefined) {
    return fail('backup.invalid_file', { field: 'schemaVersion', cause: 'missing-schema-version' });
  }
  if (
    typeof parsed.schemaVersion !== 'number' ||
    !Number.isInteger(parsed.schemaVersion) ||
    parsed.schemaVersion <= 0
  ) {
    return fail('backup.invalid_file', { field: 'schemaVersion', cause: 'invalid-schema-version' });
  }
  if (parsed.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    return fail('backup.version_unsupported', { field: 'schemaVersion' });
  }

  const tables = emptyTables();
  for (const table of EXPORT_TABLES) {
    const raw = parsed[table];
    if (!Array.isArray(raw)) {
      return fail('backup.invalid_file', { field: 'data', cause: `missing-table:${table}` });
    }
    const seen = new Set<string>();
    for (const item of raw) {
      if (!isPlainObject(item) || typeof item.id !== 'string' || item.id.length === 0) {
        return fail('backup.invalid_file', { field: 'data', cause: `invalid-row:${table}` });
      }
      const row = item as ImportRow;
      if (isExampleRecord(row)) continue;
      if (seen.has(row.id)) {
        return fail('backup.invalid_file', { field: 'data', cause: `duplicate-id:${table}` });
      }
      seen.add(row.id);
      tables[table].push(row);
    }
  }

  const counts = EXPORT_TABLES.reduce((acc, table) => {
    acc[table] = tables[table].length;
    return acc;
  }, {} as ExportCounts);

  return ok({
    tables,
    summary: {
      schemaVersion: parsed.schemaVersion,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
      appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : null,
      counts,
    },
  });
}
