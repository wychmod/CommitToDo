import { describe, expect, it } from 'vitest';
import { navSectionFor } from './nav-selection';

describe('navSectionFor（一级入口归属）', () => {
  it('四个一级入口各自映射', () => {
    expect(navSectionFor('/today')).toBe('today');
    expect(navSectionFor('/branches')).toBe('branches');
    expect(navSectionFor('/history')).toBe('history');
    expect(navSectionFor('/me')).toBe('me');
  });

  it('二级页继承所属一级入口', () => {
    expect(navSectionFor('/branches/product-design')).toBe('branches');
    expect(navSectionFor('/history/2026')).toBe('history');
    expect(navSectionFor('/settings')).toBe('me');
    expect(navSectionFor('/data')).toBe('me');
  });

  it('更深的路径仍按首个路径段归属', () => {
    expect(navSectionFor('/branches/product-design/tasks')).toBe('branches');
    expect(navSectionFor('/today/all')).toBe('today');
  });

  it('查询串与 hash 不改变归属', () => {
    expect(navSectionFor('/settings#account')).toBe('me');
    expect(navSectionFor('/data?view=backup')).toBe('me');
    expect(navSectionFor('/branches?view=archived#top')).toBe('branches');
  });

  it('首页、认证页与未知路由不归入任何入口', () => {
    expect(navSectionFor('/')).toBeNull();
    expect(navSectionFor('/auth/login')).toBeNull();
    expect(navSectionFor('/unknown')).toBeNull();
  });
});
