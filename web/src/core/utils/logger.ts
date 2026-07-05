export const logger = {
  debug(...args: unknown[]): void {
    if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
      console.debug('[Commit]', ...args);
    }
  },

  info(...args: unknown[]): void {
    console.info('[Commit]', ...args);
  },

  warn(...args: unknown[]): void {
    console.warn('[Commit]', ...args);
  },

  error(...args: unknown[]): void {
    console.error('[Commit]', ...args);
  },
};
