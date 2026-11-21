/**
 * 最近使用的登录邮箱（PRD V2-01 §5「本机状态」）。
 *
 * 只用于回填输入框，不保存密码或会话；找回密码过程中关闭页面后，
 * 已发送步骤不恢复，但邮箱可以重新带出来。
 */
const LAST_EMAIL_KEY = 'committodo.last-email';

export function readLastEmail(): string {
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberEmail(email: string): void {
  try {
    window.localStorage.setItem(LAST_EMAIL_KEY, email);
  } catch {
    // 存储不可用时只影响下次回填。
  }
}
