import { fail, ok, type Result } from '@/core/errors';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { yearReviewRepository } from './repositories';
import type { YearReview } from './types';

export interface SaveYearReviewInput {
  year: number;
  note: string;
}

export interface SaveYearReviewOutput {
  year: number;
  /** 归一化后的文本；清空保存时为 `''`。 */
  note: string;
  /** 该年没有非空总结时为 `null`。 */
  id: string | null;
  row: YearReview | null;
}

const FIRST_YEAR = 1000;
const LAST_YEAR = 9999;

/**
 * 保存年度总结（V1-02 OP-06）。
 *
 * 每用户每年只保留一行：已有行则更新，没有则新建。清空（仅空白字符）并保存
 * 时删除该行，读取自然回到「写一句这一年」的空态。
 * `events` 没有年度总结的 action（CODE-STRUCTURE §4.2），本用例不写事件。
 */
export async function saveYearReview(
  input: SaveYearReviewInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<SaveYearReviewOutput>> {
  if (!Number.isInteger(input.year) || input.year < FIRST_YEAR || input.year > LAST_YEAR) {
    return fail('validation.invalid_input', { field: 'year' });
  }

  const note = input.note.trim();

  try {
    return await db.transaction('rw', [db.yearReviews], async () => {
      const existing = await yearReviewRepository.getByOwnerYear(LOCAL_OWNER_ID, input.year);

      if (note === '') {
        if (existing) await yearReviewRepository.remove(existing.id);
        return ok({ year: input.year, note: '', id: null, row: null });
      }

      const at = deps.clock.now();
      if (existing) {
        await yearReviewRepository.update(existing.id, { note, updatedAt: at }, existing.rev);
        return ok({
          year: input.year,
          note,
          id: existing.id,
          row: { ...existing, note, rev: existing.rev + 1, updatedAt: at },
        });
      }

      const row: YearReview = {
        id: deps.ids.ulid(at),
        ownerId: LOCAL_OWNER_ID,
        year: input.year,
        note,
        rev: 1,
        createdAt: at,
        updatedAt: at,
      };
      await yearReviewRepository.create(row);
      return ok({ year: input.year, note, id: row.id, row });
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
