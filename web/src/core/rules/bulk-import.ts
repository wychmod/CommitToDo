/**
 * 批量导入的多行拆分（PRD V1-07 B-02 / OP-01）。
 *
 * 一行一条，去首尾空白，跳过空行；不解析日期与分支，原文即标题。
 * 非空行超过上限时只标记拒绝，绝不截断——静默丢行会让用户以为导入完整。
 */

export const BULK_IMPORT_MAX = 200;

export interface BulkImportEntry {
  /** 原始行号（从 1 起），用于预览删除时保持行稳定。 */
  line: number;
  title: string;
}

export interface BulkImportParse {
  entries: BulkImportEntry[];
  effectiveCount: number;
  /** 非空行数超过上限，调用方应拒绝导入并提示分批。 */
  overLimit: boolean;
}

export function parseBulkImport(text: string): BulkImportParse {
  const entries: BulkImportEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index]!.trim();
    if (!title) continue;
    entries.push({ line: index + 1, title });
  }
  return {
    entries,
    effectiveCount: entries.length,
    overLimit: entries.length > BULK_IMPORT_MAX,
  };
}

/** 预览里删掉一行；行号保持是拆分时的原始行号，不重排。 */
export function withoutBulkEntry(
  entries: readonly BulkImportEntry[],
  line: number,
): BulkImportEntry[] {
  return entries.filter((entry) => entry.line !== line);
}
