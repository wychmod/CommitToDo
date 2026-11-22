import { fail, ok, type Result } from '@/core/errors';
import { authFailureCode, authFailureReason, type AuthSession } from '@/core/rules/auth-form';

/**
 * 账号认证的云端适配（PRD V2-01 §4 / OP-01～OP-07）。
 *
 * 账号由 CloudBase 托管：不建 `users` 表、不保存密码或哈希，Web 只拿会话里的
 * `principalId` 与邮箱。SDK 按需加载，未配置云环境时统一返回 `auth.unavailable`，
 * 页面据此提示先使用本机工作区。
 */

interface AuthErrorLike {
  category?: string;
  code?: string;
  message?: string;
}

interface AuthLikeResponse<T> {
  data: T;
  error: AuthErrorLike | null;
}

async function getAuth() {
  const { getCloudBaseApp } = await import('./client');
  return getCloudBaseApp().auth();
}

function isUnavailable(cause: unknown): boolean {
  const detail = cause as AuthErrorLike | null;
  return detail?.message === 'cloud.not_configured';
}

function toFailure<T>(cause: unknown): Result<T> {
  if (isUnavailable(cause)) {
    return fail('auth.unavailable', { retriable: false, cause });
  }
  const detail = (cause ?? {}) as AuthErrorLike;
  const reason = authFailureReason(detail.category, detail.code);
  return fail(authFailureCode(reason), { retriable: reason === 'retry', cause });
}

function toSession(user: unknown, fallbackEmail = ''): AuthSession | null {
  if (typeof user !== 'object' || user === null) return null;
  const record = user as { id?: unknown; email?: unknown };
  if (record.id === undefined || record.id === null) return null;
  const email = typeof record.email === 'string' ? record.email : fallbackEmail;
  return { principalId: String(record.id), email };
}

/** 登录；账号不存在与密码错误都由调用方显示同一句文案。 */
export async function signIn(email: string, password: string): Promise<Result<AuthSession>> {
  try {
    const auth = await getAuth();
    const result = (await auth.signInWithPassword({
      email,
      password,
    })) as AuthLikeResponse<{ user?: unknown; session?: unknown }>;
    if (result.error) return toFailure<AuthSession>(result.error);

    const session = toSession(result.data.user, email);
    if (session) return ok(session);
    return fail('auth.email_unverified', { retriable: false });
  } catch (cause) {
    return toFailure<AuthSession>(cause);
  }
}

/**
 * 注册。多数环境注册后直接返回会话；若开启了邮箱验证，则先尝试登录，
 * 仍拿不到会话时提示先完成邮箱验证。
 */
export async function signUp(email: string, password: string): Promise<Result<AuthSession>> {
  try {
    const auth = await getAuth();
    const result = (await auth.signUp({
      email,
      password,
    })) as AuthLikeResponse<{ user?: unknown; session?: unknown }>;
    if (result.error) return toFailure<AuthSession>(result.error);

    const session = toSession(result.data.user, email);
    if (session) return ok(session);

    const retry = (await auth.signInWithPassword({
      email,
      password,
    })) as AuthLikeResponse<{ user?: unknown }>;
    if (!retry.error) {
      const signedIn = toSession(retry.data.user, email);
      if (signedIn) return ok(signedIn);
    }
    return fail('auth.email_unverified', { retriable: false });
  } catch (cause) {
    return toFailure<AuthSession>(cause);
  }
}

/**
 * 发送重置邮件。邮箱不存在时也返回成功，避免把「账号是否存在」暴露给调用方。
 */
export async function requestPasswordReset(
  email: string,
  redirectTo: string,
): Promise<Result<null>> {
  try {
    const auth = await getAuth();
    const result = (await auth.resetPasswordForEmail(email, { redirectTo })) as AuthLikeResponse<
      Record<string, unknown>
    >;
    if (!result.error) return ok(null);

    const reason = authFailureReason(result.error.category, result.error.code);
    if (reason === 'credentials') return ok(null);
    return toFailure<null>(result.error);
  } catch (cause) {
    return toFailure<null>(cause);
  }
}

export interface ResetPasswordInput {
  email: string;
  /** 邮件链接或验证码带入的一次性凭据。 */
  token: string;
  password: string;
}

/** 用邮件带入的凭据设置新密码；失效或已使用时返回 `auth.reset_expired`。 */
export async function completePasswordReset(input: ResetPasswordInput): Promise<Result<null>> {
  try {
    const auth = await getAuth();
    await auth.resetPassword({
      email: input.email,
      new_password: input.password,
      verification_token: input.token,
    });
    return ok(null);
  } catch (cause) {
    const detail = (cause ?? {}) as AuthErrorLike;
    const text = `${detail.code ?? ''} ${detail.message ?? ''}`;
    if (/expire|invalid|token/i.test(text)) {
      return fail('auth.reset_expired', { retriable: false, cause });
    }
    return toFailure<null>(cause);
  }
}

/** 读取云端现有会话；没有会话或云环境不可用时返回 null。 */
export async function readCloudSession(): Promise<AuthSession | null> {
  try {
    const auth = await getAuth();
    const state = (await auth.getLoginState()) as { user?: unknown } | null;
    return toSession(state?.user);
  } catch {
    return null;
  }
}

/** 云端会话的三种校验结果：`none` 只表示确定没有会话。 */
export type CloudSessionState = 'active' | 'none' | 'unknown';

/**
 * 启动时校验一次云端会话（PRD V2-01 §5 会话失效）。
 *
 * 只有确定没有会话才返回 `none`；离线、云环境未配置等失败一律 `unknown`，
 * 调用方应保留本机会话，避免把本机编辑降级成未登录。
 */
export async function verifyCloudSession(): Promise<CloudSessionState> {
  try {
    const auth = await getAuth();
    const state = (await auth.getLoginState()) as { user?: unknown } | null;
    return toSession(state?.user) ? 'active' : 'none';
  } catch {
    return 'unknown';
  }
}

/** 退出云端会话；本机会话由调用方清除，这里失败不阻断界面。 */
export async function signOut(): Promise<void> {
  try {
    const auth = await getAuth();
    await auth.signOut();
  } catch {
    // 云端不可用时仍然允许退出本机会话。
  }
}
