import { describe, expect, it } from 'vitest';
import { matchesSearchPrefix, normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from './search-match';

/**
 * 查询归一与前缀匹配（V1-04 §8.2 / OP-02）。
 *
 * 只认开头：标题中间含查询词不算命中；拉丁字母不区分大小写，中文按字面。
 */

describe('normalizeSearchQuery', () => {
  it('去首尾空白，空查询与纯空格归一为空串', () => {
    expect(normalizeSearchQuery('')).toBe('');
    expect(normalizeSearchQuery('   ')).toBe('');
    expect(normalizeSearchQuery('  周报  ')).toBe('周报');
  });

  it('含换行时只取首行', () => {
    expect(normalizeSearchQuery('周报\n第二行')).toBe('周报');
    expect(normalizeSearchQuery('  跑\n\n')).toBe('跑');
  });

  it('第 100 与 101 字符：只保留前 100 个字符', () => {
    const hundred = '字'.repeat(SEARCH_QUERY_MAX_LENGTH);
    const hundredOne = '字'.repeat(SEARCH_QUERY_MAX_LENGTH + 1);

    expect(normalizeSearchQuery(hundred)).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
    expect(normalizeSearchQuery(hundredOne)).toBe(hundred);
    expect(matchesSearchPrefix(hundredOne, normalizeSearchQuery(hundredOne))).toBe(true);
  });
});

describe('matchesSearchPrefix', () => {
  it('只匹配开头，标题中间含查询词不算', () => {
    expect(matchesSearchPrefix('交周报', '周报')).toBe(false);
    expect(matchesSearchPrefix('周报：本周', '周报')).toBe(true);
  });

  it('拉丁字母不区分大小写', () => {
    expect(matchesSearchPrefix('Run 5K', 'run')).toBe(true);
    expect(matchesSearchPrefix('run 5K', 'RUN')).toBe(true);
  });

  it('中文按字面匹配', () => {
    expect(matchesSearchPrefix('跑步计划', '跑')).toBe(true);
    expect(matchesSearchPrefix('跑步计划', '步')).toBe(false);
  });

  it('空查询不匹配任何文本', () => {
    expect(matchesSearchPrefix('周报', '')).toBe(false);
  });
});
