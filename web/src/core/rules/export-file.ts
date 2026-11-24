/**
 * 导出文件（PRD M10 OP-01，TECH §9.8）。
 *
 * 顶层只有版本、时间、应用版本与八张表；业务表原样携带，不做字段裁剪。
 * 示例命名空间的记录不进入文件，避免把示例数据当成真实数据恢复。
 *
 * schemaVersion 2 起包含 `year_reviews`（V1-02 年度总结）。导入侧仍接受 1：
 * 旧文件没有该表，按空表处理，其余七张表结构未变，可以安全恢复。
 */

export const EXPORT_SCHEMA_VERSION = 2;

/** 可读取（导入 / 恢复）的历史版本；导出永远写 `EXPORT_SCHEMA_VERSION`。 */
export const READABLE_SCHEMA_VERSIONS: readonly number[] = [1, 2];

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
  'year_reviews',
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
  yearReviews: readonly T[];
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
  year_reviews: T[];
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

/** 该版本的文件能否被当前应用读取。 */
export function isReadableSchemaVersion(version: number): boolean {
  return READABLE_SCHEMA_VERSIONS.includes(version);
}

/** 该版本的文件是否必须带 `year_reviews`（1 没有这张表）。 */
export function requiresYearReviews(version: number): boolean {
  return version >= 2;
}

export function buildExportFile<T extends ExportRecord>(input: ExportSource<T>): ExportFile<T> {
  const branches = input.branches.filter((row) => !isExampleRecord(row));
  const tasks = input.tasks.filter((row) => !isExampleRecord(row));
  const commits = input.commits.filter((row) => !isExampleRecord(row));
  const milestones = input.milestones.filter((row) => !isExampleRecord(row));
  const badges = input.badges.filter((row) => !isExampleRecord(row));
  const settings = input.settings.filter((row) => !isExampleRecord(row));
  const events = input.events.filter((row) => !isExampleRecord(row));
  const yearReviews = input.yearReviews.filter((row) => !isExampleRecord(row));

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
      year_reviews: yearReviews,
    },
    counts: {
      branches: branches.length,
      tasks: tasks.length,
      commits: commits.length,
      milestones: milestones.length,
      badges: badges.length,
      settings: settings.length,
      events: events.length,
      year_reviews: yearReviews.length,
    },
  };
}

/** 文件体积估算：UTF-8 字节数（用于 P08 概览）。 */
export function exportByteLength(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}
