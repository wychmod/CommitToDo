import { describe, expect, it } from 'vitest';
import { AUTH_FALLBACK_PATH, resolveAuthNext } from './auth-next';

describe('resolveAuthNext', () => {
  it('缺失时回退到 /today', () => {
    expect(resolveAuthNext(null)).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext(undefined)).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext('')).toBe(AUTH_FALLBACK_PATH);
  });

  it('拒绝站外与协议相对地址', () => {
    expect(resolveAuthNext('//evil.example/today')).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext('https://evil.example')).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext('javascript:alert(1)')).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext('JavaScript:alert(1)')).toBe(AUTH_FALLBACK_PATH);
  });

  it('拒绝登录相关路径，避免登录自循环', () => {
    expect(resolveAuthNext('/auth')).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext('/auth/login')).toBe(AUTH_FALLBACK_PATH);
    expect(resolveAuthNext('/auth/recover?step=reset')).toBe(AUTH_FALLBACK_PATH);
  });

  it('保留站内路径、查询与 fragment', () => {
    expect(resolveAuthNext('/today')).toBe('/today');
    expect(resolveAuthNext('/today/all')).toBe('/today/all');
    expect(resolveAuthNext('/settings#sync')).toBe('/settings#sync');
    expect(resolveAuthNext('/settings?tab=account#sync')).toBe('/settings?tab=account#sync');
    expect(resolveAuthNext('  /branches  ')).toBe('/branches');
  });
});
