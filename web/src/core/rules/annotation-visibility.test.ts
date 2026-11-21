import { describe, expect, it } from 'vitest';
import {
  annotationState,
  hintStorageKey,
  normalizeAnnotationMode,
  parseSeenFlag,
} from './annotation-visibility';

describe('annotationState（I-02）', () => {
  it('off 不自动展开且无折叠图标', () => {
    expect(annotationState('off', false)).toBe('hidden');
    expect(annotationState('off', true)).toBe('hidden');
  });

  it('once + 未看过自动展开，关闭后折叠为图标', () => {
    expect(annotationState('once', false)).toBe('expanded');
    expect(annotationState('once', true)).toBe('collapsed');
  });

  it('always 每次进入都展开', () => {
    expect(annotationState('always', false)).toBe('expanded');
    expect(annotationState('always', true)).toBe('expanded');
  });

  it('always 切回 once 后，已看过状态保留并折叠', () => {
    expect(annotationState('always', true)).toBe('expanded');
    expect(annotationState('once', true)).toBe('collapsed');
  });
});

describe('已展示标记（按概念分键）', () => {
  it('四个概念各自一个键，互不串扰', () => {
    const keys = [
      hintStorageKey('branch'),
      hintStorageKey('merge'),
      hintStorageKey('milestone-commit'),
      hintStorageKey('stall'),
    ];
    expect(new Set(keys).size).toBe(4);
  });

  it('一个概念已看过不影响另一个概念', () => {
    const branchSeen = parseSeenFlag('1');
    const mergeSeen = parseSeenFlag(undefined);
    expect(annotationState('once', branchSeen)).toBe('collapsed');
    expect(annotationState('once', mergeSeen)).toBe('expanded');
  });

  it('标记缺失或值损坏视为未看过', () => {
    expect(parseSeenFlag(undefined)).toBe(false);
    expect(parseSeenFlag(null)).toBe(false);
    expect(parseSeenFlag('')).toBe(false);
    expect(parseSeenFlag('true')).toBe(false);
    expect(parseSeenFlag('0')).toBe(false);
    expect(parseSeenFlag('1')).toBe(true);
  });

  it('注解模式缺省与非法值回落 once', () => {
    expect(normalizeAnnotationMode(undefined)).toBe('once');
    expect(normalizeAnnotationMode(null)).toBe('once');
    expect(normalizeAnnotationMode('never')).toBe('once');
    expect(normalizeAnnotationMode('off')).toBe('off');
    expect(normalizeAnnotationMode('always')).toBe('always');
  });
});
