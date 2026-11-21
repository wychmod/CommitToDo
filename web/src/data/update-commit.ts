import { fail, ok, type Result } from '@/core/errors';
import { isCommitLocked } from '@/core/rules/commit-lock';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { commitRepository } from './repositories';
import type { Commit } from './types';

export interface UpdateCommitInput {
  commitId: string;
  summary: string;
}

/**
 * 修改提交文案（PRD M03 OP-03，M05 复用）。
 *
 * 只改 `commits.summary`，带回执内的「补一句」；不覆盖 `at` 与 `date`，
 * 不动四计数。已撤销或已删除的提交不可编辑。
 */
export async function updateCommit(
  input: UpdateCommitInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Commit>> {
  const summary = input.summary.trim();
  if (!summary) {
    return fail('validation.title_empty', { field: 'summary' });
  }

  try {
    return await db.transaction('rw', [db.commits, db.events], async (tx) => {
      const commit = await commitRepository.getById(input.commitId);
      if (!commit || commit.deletedAt !== null) {
        return fail('domain.not_found', { field: 'commitId' });
      }
      if (commit.voidedAt !== null) {
        return fail('validation.invalid_input', { field: 'summary' });
      }
      const at = deps.clock.now();
      if (isCommitLocked(commit.date, deps.tzOffset(at), at)) {
        return fail('domain.conflict', { field: 'commitId' });
      }
      if (commit.summary === summary) {
        return ok(commit);
      }

      const nextCommit: Commit = {
        ...commit,
        summary,
        updatedAt: at,
        rev: commit.rev + 1,
      };
      await commitRepository.update(commit.id, { summary, updatedAt: at }, commit.rev);
      await writeEvent(
        tx,
        'commit.update',
        commit.id,
        { commitId: commit.id, fields: ['summary'] },
        deps,
      );

      return ok(nextCommit);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
