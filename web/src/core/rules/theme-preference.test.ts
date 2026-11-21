import { describe, expect, it } from 'vitest';
import { normalizeTheme } from './theme-preference';

describe('normalizeTheme（R19）', () => {
  it('合法值只有 light 与 dark', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
  });

  it('缺省、null 与非法字符串回落浅色', () => {
    expect(normalizeTheme(undefined)).toBe('light');
    expect(normalizeTheme(null)).toBe('light');
    expect(normalizeTheme('')).toBe('light');
    expect(normalizeTheme('system')).toBe('light');
    expect(normalizeTheme('DARK')).toBe('light');
  });

  it('不跟随系统偏好：只有显式 dark 才切深色', () => {
    expect(normalizeTheme({ prefersDark: true })).toBe('light');
    expect(normalizeTheme('system-dark')).toBe('light');
  });

  it('同一输入重复调用结果一致', () => {
    expect(normalizeTheme('dark')).toBe(normalizeTheme('dark'));
    expect(normalizeTheme(undefined)).toBe(normalizeTheme(undefined));
  });
});
