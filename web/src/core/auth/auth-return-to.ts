/**
 * Safe returnTo handling for auth redirects.
 *
 * Only accepts same-origin relative paths starting with a single '/'.
 */

const BLOCKED_PATHS = ['/login', '/signup'];

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) return '/workspace';

  try {
    // Reject protocol URLs, double slashes, backslashes, control chars
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return '/workspace';
    if (raw.startsWith('//') || raw.includes('\\') || hasControlCharacter(raw)) {
      return '/workspace';
    }

    const decoded = decodeURIComponent(raw);
    // Validate the decoded value too; encoded controls and backslashes must
    // not become part of a browser navigation target.
    if (
      !decoded.startsWith('/') ||
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      hasControlCharacter(decoded)
    ) return '/workspace';

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
