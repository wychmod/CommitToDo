/**
 * Demo authentication constants.
 *
 * The credentials below are UI-only: they let a visitor experience the
 * account / sync flow without a backend. They are NOT secrets and never leave
 * the browser (no network, no token). The UI is allowed to surface
 * `admin / admin` in error / recovery copy per the approved spec.
 */

/** The single username that can sign in. */
export const demoAuthUsername = 'admin' as const;

/** The single password that can sign in. Not a key, not persisted. */
export const demoAuthPassword = 'admin' as const;

/** Session payload schema version. Bump + migrate if the shape changes. */
export const demoAuthSessionVersion = 1 as const;

/** Web Storage key shared by localStorage and sessionStorage. */
export const demoAuthStorageKey = 'commit.demo-auth.session.v1';

/** Simulated operation delay: long enough to observe loading, short enough not to drag. Tests use fake timers. */
export const demoAuthDelayMs = 450;
