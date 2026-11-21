import { describe, expect, it } from 'vitest';
import { systemIds } from './ids';

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe('systemIds（ULID 主键）', () => {
  it('生成 26 位 Crockford Base32，不含 I / L / O / U', () => {
    const id = systemIds.ulid(Date.UTC(2026, 10, 20, 8, 42));
    expect(id).toHaveLength(26);
    expect(id).toMatch(ULID_RE);
  });

  it('同一毫秒内生成也不重复', () => {
    const at = 1_800_000_000_000;
    expect(systemIds.ulid(at)).not.toBe(systemIds.ulid(at));
  });

  it('时间部分可直接字典序比较', () => {
    expect(systemIds.ulid(1_000).slice(0, 10) < systemIds.ulid(2_000).slice(0, 10)).toBe(true);
  });
});
