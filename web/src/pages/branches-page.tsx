import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Annotation } from '@/components/annotation';
import { BranchPanel, type BranchPanelState } from '@/components/branches/branch-panel';
import { BranchTree } from '@/components/branches/branch-tree';
import { BRANCH_TREE_LIMIT, countActiveBranches } from '@/core/rules/branch-quota';
import { useBranchesView } from '@/data/hooks';
import type { Branch } from '@/data/types';
import { t } from '@/i18n';
import { useBranchesStore } from '@/stores/branches.store';
import { EmptyState } from '@/ui/empty-state';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

const SKELETON_LEVELS = [0, 1, 2, 1, 2];

function TreeSkeleton() {
  return (
    <div className={styles.treeLoading} role="status" aria-live="polite">
      <span className={styles.treeLoadingLabel}>{t('state.loading')}</span>
      {SKELETON_LEVELS.map((level, index) => (
        <span
          key={index}
          className={styles.treeSkeletonRow}
          data-depth={level}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * P02 分支树。
 *
 * 树本身只读取 branches；新建、改名、移动都走侧栏表单，
 * 成功后展开到新行并把焦点落到该行，失败时面板保留输入。
 */
export function BranchesPage() {
  const view = useBranchesView();
  const [searchParams, setSearchParams] = useSearchParams();
  const [panel, setPanel] = useState<BranchPanelState | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const expandMany = useBranchesStore((state) => state.expandMany);

  const live = view.branches.filter((branch) => branch.deletedAt === null);
  const root = live.find((branch) => branch.depth === 0);
  const used = countActiveBranches(live);

  const closePanel = useCallback(() => setPanel(null), []);
  const handleFocusHandled = useCallback(() => setFocusId(null), []);
  const openCreateChild = useCallback((parent: Branch) => setPanel({ mode: 'create', parent }), []);
  const openRename = useCallback((branch: Branch) => setPanel({ mode: 'rename', branch }), []);
  const openMove = useCallback((branch: Branch) => setPanel({ mode: 'move', branch }), []);

  const openCreate = useCallback(() => {
    if (root) setPanel({ mode: 'create', parent: root });
  }, [root]);

  useEffect(() => {
    if (searchParams.get('new') !== '1' || !root) return;
    setPanel({ mode: 'create', parent: root });
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, root, setSearchParams]);

  const handleSaved = useCallback(
    (branch: Branch) => {
      // path 已包含自身与全部祖先 id；展开它们，保证新行在树里可见。
      const chain = branch.path.split('/').filter(Boolean);
      expandMany(chain);
      setFocusId(branch.id);
      setPanel(null);
    },
    [expandMany],
  );

  const action = root ? (
    <button type="button" className={styles.action} onClick={openCreate}>
      {t('page.branches.action')}
    </button>
  ) : undefined;

  const retry = (
    <button type="button" className={styles.action} onClick={view.retry}>
      {t('error.retry')}
    </button>
  );

  return (
    <PageShell
      titleKey="page.branches.title"
      bodyKey="page.branches.body"
      action={view.status === 'ready' && root ? action : undefined}
    >
      <div className={styles.notice}>
        <Annotation concept="branch" textKey="annotation.branch" />
      </div>

      {view.status === 'error' ? (
        <EmptyState messageKey="branches.loadFailed" action={retry} />
      ) : view.status === 'loading' || !root ? (
        <TreeSkeleton />
      ) : (
        <>
          <BranchTree
            branches={live}
            focusId={focusId}
            onFocusHandled={handleFocusHandled}
            onCreateChild={openCreateChild}
            onRename={openRename}
            onMove={openMove}
          />
          {live.length <= 1 ? <EmptyState messageKey="branches.empty" action={action} /> : null}
          <p className={styles.quota}>
            {t('branches.quota.prefix')} {used} / {BRANCH_TREE_LIMIT} {t('branches.quota.suffix')}
          </p>
        </>
      )}

      {panel ? (
        <BranchPanel state={panel} branches={live} onClose={closePanel} onSaved={handleSaved} />
      ) : null}
    </PageShell>
  );
}
