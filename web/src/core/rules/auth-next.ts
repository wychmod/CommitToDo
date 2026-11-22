/**
 * 登录回跳路径的白名单（PRD V2-01 §5 / OP-03）。
 *
 * 只接受以单个 `/` 开头的站内路径，保留查询与 `#fragment`；
 * 缺失、`//evil`、协议头、`javascript:` 与 `/auth/*` 一律回退 `/today`，
 * 避免登录成功后被带去站外或形成登录自循环。
 */

export const AUTH_FALLBACK_PATH = '/today';

export function resolveAuthNext(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return AUTH_FALLBACK_PATH;

  const value = raw.trim();
  if (!value.startsWith('/')) return AUTH_FALLBACK_PATH;
  // `//evil.example` 会被浏览器当成协议相对地址，直接拒绝。
  if (value.startsWith('//')) return AUTH_FALLBACK_PATH;
  // 部分浏览器把 `/\evil.example` 归一成 `//evil.example`，同样按站外处理。
  if (value.startsWith('/\\')) return AUTH_FALLBACK_PATH;

  const path = (value.split(/[?#]/)[0] ?? '').toLowerCase();
  if (path === '/auth' || path.startsWith('/auth/')) return AUTH_FALLBACK_PATH;

  return value;
}
