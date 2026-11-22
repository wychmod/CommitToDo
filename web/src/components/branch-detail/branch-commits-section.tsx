import { useEffect, useMemo, useState } from 'react';
import { branchCommitFeed, COMMIT_PAGE_SIZE, isIncomingCommit } from '@/core/rules/commit-feed';
import type { Branch, Commit } from '@/data/types';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { formatShortDateTime } from './format';
import styles from './branch-commits-section.module.css';

interface BranchCommitsSectionProps {
  branchId: string;
  commits: readonly Commit[];
  branches: readonly Branch[];
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
}

/**
 * 分支详情 · 提交流（M04 §4.3 / OP-04）。
 *
 * 只显示有效提交（R3），按日期与时刻倒序；每页 20 条，用「加载更多」翻页。
 * 合并后来源为子分支的行加「来自 X」，不参与本分支自己的提交计数。
 */
export function BranchCommitsSection({
  branchId,
  commits,
  branches,
  status,
  retry,
}: BranchCommitsSectionProps) {
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const [limit, setLimit] = useState(COMMIT_PAGE_SIZE);

  useEffect(() => {
    setLimit(COMMIT_PAGE_SIZE);
  }, [branchId]);

  const byId = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const feed = useMemo(() => branchCommitFeed(commits, branchId), [commits, branchId]);
  const visible = feed.slice(0, limit);
  const hasMore = visible.length < feed.length;

  return (
    <section id="branch-commits" className={styles.section} aria-labelledby="branch-commits-title">
      <div className={styles.head}>
        <h2 id="branch-commits-title" className={styles.title}>
          {t('branchDetail.section.commits')}
          <span className={styles.count}>{feed.length}</span>
        </h2>
      </div>

      {status === 'loading' ? (
        <p className={styles.state} role="status">
          {t('state.loading')}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('branchDetail.commits.loadFailed')}</p>
          <button type="button" className={styles.retry} onClick={retry}>
            {t('branchDetail.retry')}
          </button>
        </div>
      ) : null}

      {status === 'ready' && feed.length === 0 ? (
        <p className={styles.state}>{t('branchDetail.commits.empty')}</p>
      ) : null}

      {feed.length > 0 ? (
        <>
          <ul className={styles.list}>
            {visible.map((commit) => {
              const incoming = isIncomingCommit(commit, branchId);
              const source = incoming ? byId.get(commit.sourceBranchId) : undefined;
              return (
                <li key={commit.id}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => openCommitDetail(commit.id)}
                  >
                    <span className={styles.time}>{formatShortDateTime(commit.at)}</span>
                    <span className={styles.summary}>{commit.summary}</span>
                    {incoming ? (
                      <span className={styles.source}>
                        {t('branchDetail.commits.incomingPrefix')}
                        {source?.title ?? commit.sourceBranchId}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <button
              type="button"
              className={styles.more}
              onClick={() => setLimit((value) => value + COMMIT_PAGE_SIZE)}
            >
              {t('branchDetail.commits.loadMore')}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
