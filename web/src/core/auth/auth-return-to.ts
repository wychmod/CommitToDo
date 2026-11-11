/**
 * Safe returnTo handling for auth redirects.
 *
 * Only accepts same-origin relative paths starting with a single '/'.
 */

const BLOCKED_PATHS = ['/login', '/signup'];

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) return '/workspace';

  try {
    // Reject protocol URLs, double slashes, backslashes, control chars
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return '/workspace';
    // eslint-disable-next-line no-control-regex
    if (raw.startsWith('//') || raw.includes('\\') || /[\x00-\x1f]/.test(raw)) {
      return '/workspace';
    }

    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/workspace';

    const path = decoded.split('?')[0].split('#')[0];
    if (BLOCKED_PATHS.includes(path)) return '/workspace';

    return decoded;
  } catch {
    return '/workspace';
  }
}

export function buildLoginReturnTo(pathname: string, search: string, hash: string): string {
  const full = `${pathname}${search}${hash}`;
  return `/login?returnTo=${encodeURIComponent(full)}`;
}
