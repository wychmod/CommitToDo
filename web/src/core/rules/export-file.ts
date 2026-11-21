/**
 * 导出文件（PRD M10 OP-01，TECH §9.8）。
 *
 * 顶层只有版本、时间、应用版本与七张表；业务表原样携带，不做字段裁剪。
 * 示例命名空间的记录不进入文件，避免把示例数据当成真实数据恢复。
 */

export const EXPORT_SCHEMA_VERSION = 1;

/** 与 `web/package.json` 的 `version` 保持一致，用于导入摘要展示。 */
export const EXPORT_APP_VERSION = '0.1.0';

export const EXPORT_TABLES = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
  'settings',
  'events',
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];

export type ExportCounts = Record<ExportTable, number>;

export interface ExportRecord {
  id: string;
  ownerId?: string;
}

export interface ExportSource<T extends ExportRecord> {
  exportedAt: string;
  /** 本地自然日，`YYYY-MM-DD`；只用于文件名。 */
  localDate: string;
  branches: readonly T[];
  tasks: readonly T[];
  commits: readonly T[];
  milestones: readonly T[];
  badges: readonly T[];
  settings: readonly T[];
  events: readonly T[];
}

export interface ExportFilePayload<T extends ExportRecord> {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  branches: T[];
  tasks: T[];
  commits: T[];
  milestones: T[];
  badges: T[];
  settings: T[];
  events: T[];
}

export interface ExportFile<T extends ExportRecord> {
  fileName: string;
  payload: ExportFilePayload<T>;
  counts: ExportCounts;
}

/** 示例命名空间：owner 为 `example` 或 id 带 `example:` 前缀。 */
export function isExampleRecord(row: ExportRecord): boolean {
  return row.ownerId === 'example' || row.id.startsWith('example:');
}

export function exportFileName(localDate: string): string {
  return `committo-export-${localDate}.json`;
}

export function buildExportFile<T extends ExportRecord>(input: ExportSource<T>): ExportFile<T> {
  const branches = input.branches.filter((row) => !isExampleRecord(row));
  const tasks = input.tasks.filter((row) => !isExampleRecord(row));
  const commits = input.commits.filter((row) => !isExampleRecord(row));
  const milestones = input.milestones.filter((row) => !isExampleRecord(row));
  const badges = input.badges.filter((row) => !isExampleRecord(row));
  const settings = input.settings.filter((row) => !isExampleRecord(row));
  const events = input.events.filter((row) => !isExampleRecord(row));

  return {
    fileName: exportFileName(input.localDate),
    payload: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: input.exportedAt,
      appVersion: EXPORT_APP_VERSION,
      branches,
      tasks,
      commits,
      milestones,
      badges,
      settings,
      events,
    },
    counts: {
      branches: branches.length,
      tasks: tasks.length,
      commits: commits.length,
      milestones: milestones.length,
      badges: badges.length,
      settings: settings.length,
      events: events.length,
    },
  };
}

/** 文件体积估算：UTF-8 字节数（用于 P08 概览）。 */
export function exportByteLength(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}
