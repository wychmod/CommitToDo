const TAKEOVER_NOTICE_KEY = 'committodo.takeover.pending';

/**
 * 登录/注册把本机数据归属到账号后记一次提示（PRD V2-01 §8.1-12），
 * 由 `/settings` 展示后清除，每次登录最多提示一次。
 */
export function markTakeoverPending(): void {
  try {
    window.sessionStorage.setItem(TAKEOVER_NOTICE_KEY, '1');
  } catch {
    // 会话存储不可用时只是少一次提示，不影响登录结果。
  }
}

/** 读取并清除「登录后由同步接管」提示。 */
export function consumeTakeoverNotice(): boolean {
  try {
    if (window.sessionStorage.getItem(TAKEOVER_NOTICE_KEY) !== '1') return false;
    window.sessionStorage.removeItem(TAKEOVER_NOTICE_KEY);
    return true;
  } catch {
    return false;
  }
}
