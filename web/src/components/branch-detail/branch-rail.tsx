import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import { displayBranchTrail } from '@/core/rules/branch-path';
import { branchCommitFeed } from '@/core/rules/commit-feed';
import type { BranchColor } from '@/core/rules/branch-color';
import { formatMilestoneDate } from '@/core/rules/milestone-date';
import { currentTzOffset, localClockTime } from '@/core/clock';
import type { Branch, Commit } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { ArrowIcon, CheckIcon } from '@/ui/icons';
import { BranchTag } from '@/components/today/branch-tag';
import { formatLongDate, formatShortDateTime } from './format';
import styles from './branch-rail.module.css';

const COLOR_KEYS: Record<BranchColor, MessageKey> = {
  coral: 'branches.color.coral',
  sky: 'branches.color.sky',
  honey: 'branches.color.honey',
  mint: 'branches.color.mint',
  iris: 'branches.color.iris',
  rose: 'branches.color.rose',
  teal: 'branches.color.teal',
};

interface BranchRailProps {
  branch: Branch;
  branches: readonly Branch[];
  commits: readonly Commit[];
}

function shortDate(at: number): string {
  return formatMilestoneDate(at, 'day', currentTzOffset(at));
}

/**
 * 分支详情 · 右栏（P03-2）。
 *
 * 「分支信息」按画稿列出上级分支、创建于、最近提交与颜色；
 * 下方回执显示本分支最近一条有效提交，点击可打开提交详情。
 */
export function BranchRail({ branch, branches, commits }: BranchRailProps) {
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const byId = useMemo(() => new Map(branches.map((row) => [row.id, row])), [branches]);
  const latest = useMemo(
    () => branchCommitFeed(commits, branch.id)[0] ?? null,
    [commits, branch.id],
  );

  const parent = branch.parentId ? byId.get(branch.parentId) : undefined;
  const color = branch.depth === 0 ? 'neutral' : normalizeBranchColor(branch.color);
  const shade = branchShadeForDepth(branch.depth);
  const trail = displayBranchTrail(branch, byId);

  return (
    <aside className={styles.rail} aria-label={t('branchDetail.rail.label')}>
      <section className={styles.card} aria-labelledby="branch-info-title">
        <h2 id="branch-info-title" className={styles.cardTitle}>
          {t('branchDetail.info.title')}
        </h2>
        <dl className={styles.meta}>
          <div>
            <dt>{t('branchDetail.info.parent')}</dt>
            <dd>
              {parent ? (
                <Link className={styles.metaLink} to={`/branches/${parent.id}`}>
                  {parent.title}
                </Link>
              ) : (
                t('search.rootPath')
              )}
            </dd>
          </div>
          <div>
            <dt>{t('branchDetail.info.createdAt')}</dt>
            <dd>{formatLongDate(branch.createdAt)}</dd>
          </div>
          <div>
            <dt>{t('branches.date.lastCommit')}</dt>
            <dd>{latest ? formatShortDateTime(latest.at) : t('branches.date.none')}</dd>
          </div>
          {branch.status === 'merged' && branch.finishedAt !== null ? (
            <div>
              <dt>{t('branches.date.mergedAt')}</dt>
              <dd>{shortDate(branch.finishedAt)}</dd>
            </div>
          ) : null}
          {branch.status === 'dropped' && branch.droppedAt !== null ? (
            <div>
              <dt>{t('branches.date.droppedAt')}</dt>
              <dd>{shortDate(branch.droppedAt)}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t('branchDetail.info.color')}</dt>
            <dd>
              {branch.depth === 0 ? (
                t('search.rootPath')
              ) : (
                <>
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: `var(--${color}-${shade})` }}
                    aria-hidden="true"
                  />
                  {t(COLOR_KEYS[normalizeBranchColor(branch.color)])}
                  {parent ? `${t('branchDetail.info.inheritedFrom')} ${parent.title}` : null}
                </>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.receipt} aria-label={t('branchDetail.receipt.label')}>
        {latest ? (
          <>
            <div className={styles.receiptHeading}>
              <span className={styles.receiptCheck} aria-hidden="true">
                <CheckIcon size={15} />
              </span>
              <span>{t('today.receipt.donePrefix')}</span>
              <time className={styles.receiptTime}>{localClockTime(latest.at)}</time>
            </div>
            <button
              type="button"
              className={styles.receiptTitle}
              onClick={() => openCommitDetail(latest.id)}
            >
              {latest.summary}
            </button>
            <div className={styles.receiptFoot}>
              <BranchTag branch={branch} trail={trail} />
              <Link className={styles.receiptLink} to={`/history?commit=${latest.id}`}>
                {t('today.receipt.view')}
                <ArrowIcon size={14} />
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.cardTitle}>{t('branchDetail.receipt.label')}</h2>
            <p className={styles.empty}>{t('branchDetail.receipt.empty')}</p>
          </>
        )}
      </section>
    </aside>
  );
}
