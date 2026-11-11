/**
 * Single-flight session refresh lock.
 *
 * Prevents concurrent 401s from triggering multiple refreshSession calls in
 * the same browsing context.
 */

export class SessionRefreshLock {
  private promise: Promise<unknown> | null = null;

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.promise) {
      try {
        await this.promise;
      } catch {
        // ignore previous refresh failures
      }
    }

    this.promise = fn();
    try {
      return await this.promise as T;
    } finally {
      this.promise = null;
    }
  }
}
