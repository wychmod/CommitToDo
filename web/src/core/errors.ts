/**
 * 错误模型（docs/CODE-STRUCTURE.md §3）。
 *
 * 可预期失败（校验、只读、额度、版本、导入损坏、写失败）返回 `Result`；
 * 违反不变量（事务外调用、未知状态）抛 `Error`，由错误边界承接。
 */

export type ErrorCode =
  | 'validation.invalid_input'
  | 'validation.title_empty'
  | 'domain.readonly_branch'
  | 'domain.quota_exceeded'
  | 'domain.not_found'
  | 'domain.conflict'
  | 'storage.write_failed'
  | 'storage.read_failed'
  | 'backup.invalid_file'
  | 'backup.version_unsupported'
  | 'auth.invalid_credentials';

export interface AppError {
  code: ErrorCode;
  /** 字段级错误的落点，如 `title`、`dueDate`；为空时走回执或弹层。 */
  field?: string;
  /** 是否给出「重试」入口。 */
  retriable: boolean;
  cause?: unknown;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(
  code: ErrorCode,
  options: Partial<Omit<AppError, 'code'>> = {},
): Result<never> {
  return { ok: false, error: { retriable: false, ...options, code } };
}
