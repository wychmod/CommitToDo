import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localDate } from '@/core/clock';
import { useSampleTree } from '@/data/hooks';
import { clearSampleTree } from '@/data/sample-namespace';
import type { Branch } from '@/data/types';
import { t } from '@/i18n';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { EmptyState } from '@/ui/empty-state';
import { CheckIcon, ChevronDownIcon, SvgIcon, TrashIcon } from '@/ui/icons';
import { LoadingShell } from '@/ui/loading-shell';
import styles from './sample-page.module.css';

const PREVIEW_COMMIT_COUNT = 5;

function shortDate(date: string): string {
  return date.slice(5).replace('-', '.');
}

function SampleBranch({
  branch,
  childrenByParent,
  highlighted = false,
}: {
  branch: Branch;
  childrenByParent: ReadonlyMap<string | null, readonly Branch[]>;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = childrenByParent.get(branch.id) ?? [];
  const hasChildren = children.length > 0;

  return (
    <li className={styles.branch} data-color={branch.color} data-depth={branch.depth}>
      <div className={styles.branchRow} data-highlighted={highlighted}>
        {hasChildren ? (
          <button
            type="button"
            className={styles.branchToggle}
            aria-expanded={expanded}
            aria-label={`${t(expanded ? 'branches.collapse' : 'branches.expand')} · ${branch.title}`}
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDownIcon size={16} />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <span className={styles.branchDot} aria-hidden="true" />
        <span className={styles.branchTitle} title={branch.goal ?? undefined}>
          {branch.title}
        </span>
      </div>
      {hasChildren ? (
        <ul className={styles.children} hidden={!expanded}>
          {children.map((child) => (
            <SampleBranch key={child.id} branch={child} childrenByParent={childrenByParent} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * O06-sample-tree 示例树（PRD M12 A-02）。
 *
 * 只读展示独立命名空间里的分支、提交与里程碑；横幅固定在顶部，
 * 删除示例经一次确认后物理清除示例行并回到今天页，真实数据不受影响。
 */
export function SamplePage() {
  const navigate = useNavigate();
  const sample = useSampleTree();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [allCommits, setAllCommits] = useState(false);

  const branchIds = new Set(sample.branches.map((branch) => branch.id));
  const childrenByParent = new Map<string | null, Branch[]>();
  for (const branch of sample.branches) {
    const parentId = branch.parentId && branchIds.has(branch.parentId) ? branch.parentId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(branch);
    childrenByParent.set(parentId, siblings);
  }
  const branches = childrenByParent.get(null) ?? [];
  const commits = sample.commits.slice().reverse();
  const milestones = sample.milestones.slice().reverse();
  const visibleCommits = allCommits ? commits : commits.slice(0, PREVIEW_COMMIT_COUNT);
  const commitsToggleLabel = t(allCommits ? 'sample.commits.collapse' : 'sample.commits.expand');
  const empty = sample.status === 'ready' && sample.branches.length === 0;

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await clearSampleTree();
    if (result.ok) {
      navigate('/today');
      return;
    }
    setBusy(false);
    setFailed(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1>{t('page.sample.title')}</h1>
        <p>{t('page.sample.body')}</p>
      </header>
      <div className={styles.banner} role="note">
        <span className={styles.bannerCopy}>
          <span className={styles.sectionIcon} aria-hidden="true">
            <SvgIcon size={16} strokeWidth={2}>
              <path d="M12 11v6M12 7h.01" />
            </SvgIcon>
          </span>
          <span>{t('sample.banner')}</span>
        </span>
        <button
          type="button"
          className={styles.delete}
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <TrashIcon size={24} strokeWidth={2} />
          {t('sample.delete')}
        </button>
      </div>

      {sample.status === 'loading' ? <LoadingShell /> : null}

      {sample.status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('sample.loadFailed')}</p>
          <button type="button" className={styles.retry} onClick={sample.retry}>
            {t('error.retry')}
          </button>
        </div>
      ) : null}

      {empty ? (
        <EmptyState
          messageKey="sample.empty"
          action={
            <button type="button" className={styles.primary} onClick={() => navigate('/today')}>
              {t('sample.backToday')}
            </button>
          }
        />
      ) : null}

      {sample.status === 'ready' && sample.branches.length > 0 ? (
        <div className={styles.sections}>
          <p className={styles.readonly}>{t('sample.readonly')}</p>

          <section className={styles.section} aria-labelledby="sample-branches">
            <h2 id="sample-branches" className={`${styles.sectionTitle} ${styles.treeTitle}`}>
              <SvgIcon size={24} strokeWidth={2}>
                <circle cx="12" cy="5" r="2.5" />
                <circle cx="5" cy="18" r="2.5" />
                <circle cx="19" cy="18" r="2.5" />
                <path d="M12 7.5V10m-7 5.5V14a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1.5" />
              </SvgIcon>
              {t('sample.branches')}
            </h2>
            <ul className={styles.tree}>
              {branches.map((branch, index) => (
                <SampleBranch
                  key={branch.id}
                  branch={branch}
                  childrenByParent={childrenByParent}
                  highlighted={index === 0}
                />
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="sample-commits">
            <header className={styles.sectionHead}>
              <h2 id="sample-commits" className={styles.sectionTitle}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <CheckIcon size={16} strokeWidth={2} />
                </span>
                {t('sample.commits')}
              </h2>
              {commits.length > PREVIEW_COMMIT_COUNT ? (
                <button
                  type="button"
                  className={styles.commitsToggle}
                  aria-controls="sample-commit-list"
                  aria-expanded={allCommits}
                  aria-label={commitsToggleLabel}
                  title={commitsToggleLabel}
                  onClick={() => setAllCommits((value) => !value)}
                >
                  <ChevronDownIcon size={16} strokeWidth={2} />
                </button>
              ) : null}
            </header>
            <ul className={styles.list} id="sample-commit-list">
              {visibleCommits.map((commit) => (
                <li key={commit.id} className={styles.row}>
                  <span className={styles.rowMarker} aria-hidden="true" />
                  <span className={styles.rowTitle}>{commit.summary}</span>
                  <time className={styles.meta} dateTime={commit.date}>
                    {shortDate(commit.date)}
                  </time>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="sample-milestones">
            <h2 id="sample-milestones" className={styles.sectionTitle}>
              <span className={styles.flagIcon}>
                <SvgIcon size={20}>
                  <path d="M6 21V4l13 4-13 5" fill="currentColor" />
                </SvgIcon>
              </span>
              {t('sample.milestones')}
            </h2>
            <ul className={styles.list}>
              {milestones.map((milestone) => {
                const date = localDate(milestone.achievedAt);
                return (
                  <li key={milestone.id} className={styles.row}>
                    <span className={styles.milestoneMarker} aria-hidden="true" />
                    <span className={styles.rowTitle}>{milestone.title}</span>
                    <time className={styles.meta} dateTime={date}>
                      {shortDate(date)}
                    </time>
                  </li>
                );
              })}
            </ul>
          </section>
          <Link className={styles.back} to="/today">
            {t('sample.backToday')}
          </Link>
        </div>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          titleKey="sample.confirmTitle"
          bodyKey={failed ? 'sample.deleteFailed' : 'sample.confirmBody'}
          confirmKey="sample.confirmAction"
          busy={busy}
          onConfirm={() => void remove()}
          onClose={() => {
            setConfirming(false);
            setFailed(false);
          }}
        />
      ) : null}
    </div>
  );
}
