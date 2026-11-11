/**
 * Single-flight session refresh lock.
 *
 * Prevents concurrent 401s from triggering multiple refreshSession calls in
 * the same browsing context.
 */

export class SessionRefreshLock {
  private promise: Promise<unknown> | null = null;

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const existing = this.promise;
    if (existing) return existing as Promise<T>;

    const current = fn();
    this.promise = current;
    try {
      return await current;
    } finally {
      if (this.promise === current) this.promise = null;
    }
  }
}
