/**
 * 导入后的补查抑制（PRD M11 OP-08）。
 *
 * 导入/恢复把文件里的 `badges` 原样写入后，本次会话不再补查：
 * 即使文件缺少某枚已满足条件的徽章，也不在启动或进入「我的」时补发。
 * 新开标签页（新的会话存储）不继承该标记。
 */
const KEY = 'badge.skip-backfill';

export function markBadgeBackfillSkipped(): void {
  try {
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    // 会话存储不可用时补查仍会执行，徽章幂等不会重复发放。
  }
}

export function isBadgeBackfillSkipped(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
