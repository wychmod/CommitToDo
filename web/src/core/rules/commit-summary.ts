/**
 * 提交文案拼接（PRD M03 E-01 / README 冲突表 #13）。
 *
 * 默认等于待办标题；补一句后为「标题 —— 补一句」。
 * 始终从标题重新拼接，不在已有文案上追加，因此重复保存不会叠加分隔符；
 * 标题里本身含「——」时原样保留，不做拆分。
 */

export const COMMIT_SUMMARY_SEPARATOR = ' —— ';

export function composeCommitSummary(title: string, extra?: string | null): string {
  const base = title.trim();
  const note = extra?.trim() ?? '';
  return note ? `${base}${COMMIT_SUMMARY_SEPARATOR}${note}` : base;
}
