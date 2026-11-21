import { beforeEach, describe, expect, it } from 'vitest';
import { db, LOCAL_OWNER_ID } from './db';
import type { WriteDeps } from './deps';
import { saveYearReview } from './save-year-review';

/**
 * 年度总结 upsert（PRD V1-02 §8.2）。
 *
 * 同一 owner + year 只保留一行；清空保存后读取为空；存储失败返回 `storage.write_failed`。
 */

const AT = Date.UTC(2026, 10, 21, 9, 0);

function makeDeps(now: { value: number }, over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => now.value },
    ids: { ulid: () => `year-review-${++seq}` },
    tzOffset: () => 480,
    ...over,
  };
}

describe('年度总结读写（year_reviews）', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('同一用户同一年连续保存三次只保留一行并递增 rev', async () => {
    const now = { value: AT };
    const deps = makeDeps(now);

    await saveYearReview({ year: 2026, note: '第一版' }, deps);
    now.value = AT + 1000;
    await saveYearReview({ year: 2026, note: '第二版' }, deps);
    now.value = AT + 2000;
    const result = await saveYearReview({ year: 2026, note: '第三版' }, deps);

    const rows = await db.yearReviews.where('ownerId').equals(LOCAL_OWNER_ID).toArray();
    expect(rows).toHaveLength(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.note).toBe('第三版');
    expect(rows[0]).toMatchObject({
      year: 2026,
      note: '第三版',
      rev: 3,
      createdAt: AT,
      updatedAt: AT + 2000,
    });
  });

  it('不同年份各存一行', async () => {
    const now = { value: AT };
    const deps = makeDeps(now);

    await saveYearReview({ year: 2025, note: '去年' }, deps);
    await saveYearReview({ year: 2026, note: '今年' }, deps);

    const rows = await db.yearReviews.where('ownerId').equals(LOCAL_OWNER_ID).toArray();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.year).sort()).toEqual([2025, 2026]);
  });

  it('清空后保存，读取视为空且库内没有非空 note', async () => {
    const now = { value: AT };
    const deps = makeDeps(now);

    await saveYearReview({ year: 2026, note: '写过一句' }, deps);
    const cleared = await saveYearReview({ year: 2026, note: '   ' }, deps);

    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.value.note).toBe('');
    expect(cleared.value.id).toBeNull();

    const rows = await db.yearReviews.where('ownerId').equals(LOCAL_OWNER_ID).toArray();
    expect(rows.every((row) => row.note.trim() === '')).toBe(true);
  });

  it('没有旧行时清空保存不会新建空行', async () => {
    const result = await saveYearReview({ year: 2026, note: '' }, makeDeps({ value: AT }));

    expect(result.ok).toBe(true);
    expect(await db.yearReviews.count()).toBe(0);
  });

  it('并发两次保存后仍只有一行', async () => {
    const deps = makeDeps({ value: AT });

    const results = await Promise.all([
      saveYearReview({ year: 2026, note: '第一次' }, deps),
      saveYearReview({ year: 2026, note: '第二次' }, deps),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    const rows = await db.yearReviews
      .where('[ownerId+year]')
      .equals([LOCAL_OWNER_ID, 2026])
      .toArray();
    expect(rows).toHaveLength(1);
  });

  it('写入失败返回 storage.write_failed，不把输入当作已保存', async () => {
    db.close();
    const result = await saveYearReview({ year: 2026, note: '写不进去' }, makeDeps({ value: AT }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('storage.write_failed');

    await db.open();
  });
});
