import type { ErrorCode } from '@/core/errors';

/**
 * 认证表单的纯规则（PRD V2-01 §5 / OP-09）。
 *
 * 邮箱只做粗校验：`@` 存在且两侧非空、域名部分含 `.`。真实有效性交服务端，
 * 因此 `a@b` 这类地址通过前端校验。密码不一致、密码错误与账号不存在都只
 * 产出可预期结果，不发请求。
 */

export interface AuthSession {
  /** 身份层的账号归属键，对应业务表的 `ownerId`。 */
  principalId: string;
  email: string;
}

export function normalizeEmail(raw: string): string {
  return raw.trim();
}

export function isValidEmail(raw: string): boolean {
  const value = normalizeEmail(raw);
  if (value.length === 0) return false;

  const parts = value.split('@');
  if (parts.length !== 2) return false;

  const [local] = parts;
  const domain = parts[1] ?? '';
  return local.length > 0 && domain.length > 0 && domain.includes('.');
}

/** 两次密码必须完全一致，尾部空白与大小写差异都算不匹配。 */
export function passwordsMatch(password: string, confirm: string): boolean {
  return password === confirm;
}

export type AuthFailureReason = 'credentials' | 'emailTaken' | 'retry' | 'unavailable';

/**
 * 把 SDK 的错误归类成界面上的三种口径。
 *
 * 「密码错误」与「账号不存在」都归到 `credentials`，二者必须显示同一句文案，
 * 避免暴露账号是否存在。
 */
export function authFailureReason(category?: string, code?: string): AuthFailureReason {
  if (code && /already|exist|registered/i.test(code)) return 'emailTaken';
  if (category === 'USER_NOT_FOUND' || category === 'INVALID_CREDENTIALS') return 'credentials';
  if (category === 'PROVIDER_NOT_ENABLED') return 'unavailable';
  return 'retry';
}

export function authFailureCode(reason: AuthFailureReason): ErrorCode {
  if (reason === 'credentials') return 'auth.invalid_credentials';
  if (reason === 'emailTaken') return 'auth.email_taken';
  if (reason === 'unavailable') return 'auth.unavailable';
  return 'storage.write_failed';
}
