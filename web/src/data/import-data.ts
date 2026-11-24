import { fail, ok, type Result } from '@/core/errors';
import { validateImportFile, type ImportSummary } from '@/core/rules/import-validate';
import type { ExportCounts } from '@/core/rules/export-file';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { BUSINESS_TABLE_NAMES, replaceBusinessTables } from './restore-tables';

export interface ImportDataInput {
  text: string;
}

export interface ImportDataResult {
  counts: ExportCounts;
  summary: ImportSummary;
}

/**
 * 从文件整体替换（PRD M10 OP-05 / OP-07）。
 *
 * 先做纯函数校验，不写库；校验通过后单事务内清空八张业务表再写入文件数据：
 * 行的 `ownerId` 一律改写成当前归属（登录后导入本机导出文件不会变成空白库），
 * 分支四计数按文件内的待办与有效提交全量重算（R7），已撤销提交保留 `voidedAt`（R3）。
 * 任一步失败整体回滚，导入前的数据完整保留。
 */
export async function importData(
  input: ImportDataInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<ImportDataResult>> {
  const parsed = validateImportFile(input.text);
  if (!parsed.ok) return parsed;

  const { tables, summary } = parsed.value;

  try {
    return await db.transaction(
      'rw',
      [
        db.branches,
        db.tasks,
        db.commits,
        db.milestones,
        db.badges,
        db.settings,
        db.events,
        db.yearReviews,
        db.outbox,
      ],
      async (tx) => {
        await replaceBusinessTables(tables);
        // 换代后的数据与本机残留的待推送行无关，继续推送会把旧行复活。
        await db.outbox.clear();

        await writeEvent(
          tx,
          'data.import',
          LOCAL_OWNER_ID,
          { counts: summary.counts, schemaVersion: summary.schemaVersion },
          deps,
        );

        return ok({ counts: summary.counts, summary });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

/** 表清单的单点引用，供测试断言「替换覆盖了全部业务表」。 */
export const IMPORTED_TABLE_NAMES = BUSINESS_TABLE_NAMES;
