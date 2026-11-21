import type { ErrorCode } from '@/core/errors';
import type { MessageKey } from '@/i18n';

/**
 * 认证错误到文案的映射（PRD V2-01 OP-09）。
 *
 * 账号不存在与密码错误必须落到同一条文案，避免暴露账号是否注册。
 */
export function authErrorMessage(code: ErrorCode): MessageKey {
  switch (code) {
    case 'auth.invalid_credentials':
      return 'auth.error.credentials';
    case 'auth.email_taken':
      return 'auth.error.emailTaken';
    case 'auth.email_unverified':
      return 'auth.error.emailUnverified';
    case 'auth.reset_expired':
      return 'auth.error.resetExpired';
    case 'auth.unavailable':
      return 'auth.error.unavailable';
    case 'validation.invalid_input':
      return 'auth.error.email';
    default:
      return 'auth.error.network';
  }
}
