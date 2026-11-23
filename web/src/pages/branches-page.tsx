import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArchivedBranches } from '@/components/branches/archived-branches';
import { BranchDeletePanel } from '@/components/branch-detail/branch-delete-panel';
import { BranchFinishPanel } from '@/components/branch-detail/branch-finish-panel';
import {
  BranchLifecyclePanel,
  type BranchLifecycleMode,
} from '@/components/branch-detail/branch-lifecycle-panel';
import { BranchPanel, type BranchPanelState } from '@/components/branches/branch-panel';
import { BranchTree, type BranchTreeView } from '@/components/branches/branch-tree';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { BRANCH_TREE_LIMIT, countActiveBranches } from '@/core/rules/branch-quota';
import { visibleDefaultTree } from '@/core/rules/branch-visibility';
import { withdrawTemplate } from '@/data/apply-template';
import { useBranchesView, useTemplateState } from '@/data/hooks';
import { reorderBranches, setBranchPinned } from '@/data/reorder';
import { resumeBranch } from '@/data/resume-branch';
import type { Branch, BranchStatus } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useBranchesStore } from '@/stores/branches.store';
import { EmptyState } from '@/ui/empty-state';
import { BranchIcon, ChevronDownIcon, ListIcon, PlusIcon } from '@/ui/icons';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

const SKELETON_LEVELS = [0, 1, 2, 1, 2];

type StatusFilter = BranchStatus | 'all';

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; labelKey: MessageKey }> = [
  { value: 'all', labelKey: 'branches.filter.all' },
  { value: 'active', labelKey: 'branches.status.active' },
  { value: 'merged', labelKey: 'branches.status.merged' },
  { value: 'dropped', labelKey: 'branches.status.dropped' },
];

type Overlay =
  | { mode: 'finish' | 'delete'; branch: Branch }
  | { mode: BranchLifecycleMode; branch: Branch }
  | null;

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

function ancestorChainOf(branch: Branch): string[] {
  return branch.path.split('/').filter(Boolean).slice(0, -1);
}

/**
 * P02 分支树与归档区（S02）。
 *
 * 默认视图只画未归档分支；`?view=archived` 切到按一级分支分组的归档区。
 * 新建、改名、移动走侧栏表单，放下 / 归档 / 取消归档走生命周期面板，
 * 重新开始不弹二次确认，失败时在树上方给出可重试提示。
 */
export function BranchesPage() {
  const view = useBranchesView();
  const [searchParams, setSearchParams] = useSearchParams();
  const [panel, setPanel] = useState<BranchPanelState | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<MessageKey | null>(null);
  const [templateError, setTemplateError] = useState<MessageKey | null>(null);
  const [templateBarHidden, setTemplateBarHidden] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const template = useTemplateState();
  const expandMany = useBranchesStore((state) => state.expandMany);
  const savedScroll = useRef(0);
  const [viewMode, setViewMode] = useState<BranchTreeView>('grouped');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const archivedView = searchParams.get('view') === 'archived';
  const live = view.branches.filter((branch) => branch.deletedAt === null);
  // 归档分支及其整棵子树都不进默认树；留在树上的已合并分支照常显示（只读）。
  const treeBranches = visibleDefaultTree(live);
  const root = live.find((branch) => branch.depth === 0);
  const used = countActiveBranches(live);
  const totals = {
    active: treeBranches.filter((branch) => branch.depth > 0 && branch.status === 'active').length,
    merged: treeBranches.filter((branch) => branch.depth > 0 && branch.status === 'merged').length,
    dropped: treeBranches.filter((branch) => branch.depth > 0 && branch.status === 'dropped')
      .length,
  };
  const filterLabel = t(
    STATUS_FILTERS.find((option) => option.value === statusFilter)?.labelKey ??
      'branches.filter.all',
  );

  useEffect(() => {
    if (!filterOpen) return;
    const close = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const closePanel = useCallback(() => setPanel(null), []);
  const handleFocusHandled = useCallback(() => setFocusId(null), []);
  const openCreateChild = useCallback((parent: Branch) => setPanel({ mode: 'create', parent }), []);
  const openRename = useCallback((branch: Branch) => setPanel({ mode: 'rename', branch }), []);
  const openMove = useCallback((branch: Branch) => setPanel({ mode: 'move', branch }), []);
  const openFinish = useCallback((branch: Branch) => setOverlay({ mode: 'finish', branch }), []);
  const openDelete = useCallback((branch: Branch) => setOverlay({ mode: 'delete', branch }), []);
  const openPause = useCallback((branch: Branch) => setOverlay({ mode: 'pause', branch }), []);
  const openArchive = useCallback((branch: Branch) => setOverlay({ mode: 'archive', branch }), []);
  const openUnarchive = useCallback(
    (branch: Branch) => setOverlay({ mode: 'unarchive', branch }),
    [],
  );

  const openCreate = useCallback(() => {
    if (root) setPanel({ mode: 'create', parent: root });
  }, [root]);

  const switchView = useCallback(
    (toArchived: boolean) => {
      if (toArchived) savedScroll.current = window.scrollY;
      const next = new URLSearchParams(searchParams);
      if (toArchived) next.set('view', 'archived');
      else next.delete('view');
      setActionError(null);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (archivedView || savedScroll.current === 0) return;
    const top = savedScroll.current;
    savedScroll.current = 0;
    window.scrollTo({ top });
  }, [archivedView]);

  useEffect(() => {
    if (searchParams.get('new') !== '1' || !root) return;
    setPanel({ mode: 'create', parent: root });
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, root, setSearchParams]);

  const focusBranch = useCallback(
    (branch: Branch) => {
      expandMany(ancestorChainOf(branch));
      setFocusId(branch.id);
    },
    [expandMany],
  );

  const handleSaved = useCallback(
    (branch: Branch) => {
      // path 已包含自身与全部祖先 id；展开它们，保证新行在树里可见。
      expandMany(branch.path.split('/').filter(Boolean));
      setFocusId(branch.id);
      setPanel(null);
    },
    [expandMany],
  );

  const handleFinish = useCallback(
    (branch: Branch) => {
      setOverlay(null);
      const targetId = branch.archivedAt !== null ? branch.parentId : branch.id;
      if (targetId) {
        const parentChain = live
          .find((row) => row.id === targetId)
          ?.path.split('/')
          .filter(Boolean);
        if (parentChain) expandMany(parentChain);
        setFocusId(targetId);
      }
    },
    [expandMany, live],
  );

  const handleDeleted = useCallback((parentId: string | null) => {
    setOverlay(null);
    setFocusId(parentId);
  }, []);

  const handlePaused = useCallback(
    (branch: Branch) => {
      setOverlay(null);
      focusBranch(branch);
    },
    [focusBranch],
  );

  const handleArchived = useCallback(
    (branch: Branch) => {
      setOverlay(null);
      const parent = branch.parentId ? live.find((row) => row.id === branch.parentId) : undefined;
      if (parent) focusBranch(parent);
    },
    [focusBranch, live],
  );

  const handleUnarchived = useCallback(
    (branch: Branch) => {
      setOverlay(null);
      setActionError(null);
      focusBranch(branch);
    },
    [focusBranch],
  );

  const handleResume = useCallback(
    async (branch: Branch) => {
      setActionError(null);
      const result = await resumeBranch({ branchId: branch.id });
      if (result.ok) {
        focusBranch(branch);
        return;
      }
      setActionError('branches.lifecycle.resumeFailed');
    },
    [focusBranch],
  );

  const handleReorder = useCallback(async (parentId: string, orderedIds: string[]) => {
    setActionError(null);
    const result = await reorderBranches({ parentId, orderedIds });
    if (!result.ok) setActionError('branches.order.failed');
  }, []);

  const handleWithdraw = useCallback(async () => {
    if (!template.rootId) return;
    setTemplateError(null);
    setConfirmingWithdraw(false);
    setWithdrawing(true);
    const result = await withdrawTemplate(template.rootId);
    setWithdrawing(false);
    if (result.ok) {
      setTemplateBarHidden(true);
      return;
    }
    setTemplateError('template.withdrawFailed');
  }, [template.rootId]);

  const handleTogglePinned = useCallback(async (branch: Branch) => {
    setActionError(null);
    const result = await setBranchPinned({
      branchId: branch.id,
      pinned: branch.pinnedAt === null,
    });
    if (result.ok) setFocusId(branch.id);
    else setActionError('branches.pin.failed');
  }, []);

  const action = root ? (
    <span className={styles.headerActions}>
      {archivedView ? (
        <button
          type="button"
          className={styles.quietHeaderAction}
          onClick={() => switchView(false)}
        >
          {t('branches.archived.back')}
        </button>
      ) : (
        <button
          type="button"
          className={`${styles.action} ${styles.branchesAction}`}
          onClick={openCreate}
        >
          <PlusIcon size={16} />
          {t('page.branches.action')}
        </button>
      )}
    </span>
  ) : undefined;

  const retry = (
    <button type="button" className={styles.action} onClick={view.retry}>
      {t('error.retry')}
    </button>
  );

  const ready = view.status === 'ready' && root;

  return (
    <PageShell
      titleKey={archivedView ? 'page.branches.archivedTitle' : 'page.branches.title'}
      eyebrow={
        <span className={styles.branchesEyebrow}>
          {t(archivedView ? 'branches.archived.eyebrow' : 'branches.eyebrow')}
        </span>
      }
      bodyKey={archivedView ? 'page.branches.archivedBody' : undefined}
      action={ready ? action : undefined}
      headClassName={styles.branchesHead}
    >
      {ready && !archivedView ? (
        <div className={styles.tools}>
          <div className={styles.viewSwitch} role="group" aria-label={t('branches.view.label')}>
            <button
              type="button"
              className={styles.viewButton}
              aria-pressed={viewMode === 'grouped'}
              onClick={() => setViewMode('grouped')}
            >
              <BranchIcon size={16} />
              <span>{t('branches.view.grouped')}</span>
            </button>
            <button
              type="button"
              className={styles.viewButton}
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={16} />
              <span>{t('branches.view.list')}</span>
            </button>
          </div>

          <div className={styles.filterWrap} ref={filterRef}>
            <button
              type="button"
              className={styles.filterButton}
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((open) => !open)}
            >
              <span>{filterLabel}</span>
              <ChevronDownIcon size={13} />
            </button>
            {filterOpen ? (
              <div
                className={styles.filterMenu}
                role="listbox"
                aria-label={t('branches.filter.label')}
              >
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={statusFilter === option.value}
                    className={styles.filterOption}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setFilterOpen(false);
                    }}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={styles.filterOption}
                  onClick={() => {
                    setFilterOpen(false);
                    switchView(true);
                  }}
                >
                  {t('branches.filter.archived')}
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.totals} aria-label={t('branches.totalsLabel')}>
            <span className={styles.total} data-status="active">
              <span className={styles.totalDot} aria-hidden="true" />
              <strong>{totals.active}</strong> {t('branches.status.active')}
            </span>
            <span className={styles.total} data-status="merged">
              <span className={styles.totalDot} aria-hidden="true" />
              <strong>{totals.merged}</strong> {t('branches.status.merged')}
            </span>
            <span className={styles.total} data-status="dropped">
              <span className={styles.totalDot} aria-hidden="true" />
              <strong>{totals.dropped}</strong> {t('branches.status.dropped')}
            </span>
          </div>
        </div>
      ) : null}

      {!archivedView && template.rootId && !templateBarHidden ? (
        <section className={styles.templateBar} aria-live="polite">
          <div className={styles.templateBarCopy}>
            <strong>{t('template.withdraw')}</strong>
            <p className={styles.quiet}>
              {template.withdrawReason
                ? t('template.withdrawDisabled')
                : t('template.withdrawHint')}
            </p>
          </div>
          <div className={styles.templateBarActions}>
            <button
              type="button"
              className={styles.action}
              onClick={() => setConfirmingWithdraw(true)}
              disabled={!template.canWithdraw || withdrawing}
            >
              {t('template.withdraw')}
            </button>
            <button
              type="button"
              className={styles.templateDismiss}
              onClick={() => setTemplateBarHidden(true)}
            >
              {t('badge.dismiss')}
            </button>
          </div>
        </section>
      ) : null}

      {templateError ? (
        <p className={styles.inlineError} role="alert">
          {t(templateError)}
        </p>
      ) : null}

      {actionError ? (
        <p className={styles.inlineError} role="alert">
          {t(actionError)}
        </p>
      ) : null}

      {view.status === 'error' ? (
        <EmptyState
          messageKey={archivedView ? 'branches.archived.loadFailed' : 'branches.loadFailed'}
          action={retry}
        />
      ) : view.status === 'loading' || !root ? (
        <TreeSkeleton />
      ) : archivedView ? (
        <>
          <ArchivedBranches branches={live} onUnarchive={openUnarchive} />
          {live.every((branch) => branch.archivedAt === null) ? (
            <EmptyState messageKey="branches.archived.empty" />
          ) : null}
        </>
      ) : (
        <>
          <BranchTree
            branches={treeBranches}
            viewMode={viewMode}
            statusFilter={statusFilter}
            focusId={focusId}
            onFocusHandled={handleFocusHandled}
            onCreateChild={openCreateChild}
            onRename={openRename}
            onMove={openMove}
            onFinish={openFinish}
            onDelete={openDelete}
            onPause={openPause}
            onResume={handleResume}
            onArchive={openArchive}
            onReorder={handleReorder}
            onTogglePinned={handleTogglePinned}
          />
          {treeBranches.length <= 1 ? (
            <div className={styles.templateEntry}>
              <EmptyState messageKey="branches.empty" action={action} />
              {template.status === 'ready' && template.blank ? (
                <>
                  <p className={styles.quiet}>{t('page.branches.templateHint')}</p>
                  <Link className={styles.action} to="/branches/templates">
                    {t('page.branches.template')}
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
          <p className={styles.quota}>
            {t('branches.quota.prefix')} {used} / {BRANCH_TREE_LIMIT} {t('branches.quota.suffix')}
          </p>
        </>
      )}

      {panel ? (
        <BranchPanel state={panel} branches={live} onClose={closePanel} onSaved={handleSaved} />
      ) : null}

      {overlay?.mode === 'finish' ? (
        <BranchFinishPanel
          branch={overlay.branch}
          branches={live}
          onClose={() => setOverlay(null)}
          onFinished={handleFinish}
        />
      ) : null}

      {overlay?.mode === 'delete' ? (
        <BranchDeletePanel
          branch={overlay.branch}
          branches={live}
          onClose={() => setOverlay(null)}
          onDeleted={handleDeleted}
        />
      ) : null}

      {overlay && overlay.mode !== 'finish' && overlay.mode !== 'delete' ? (
        <BranchLifecyclePanel
          mode={overlay.mode}
          branch={overlay.branch}
          branches={live}
          onClose={() => setOverlay(null)}
          onDone={
            overlay.mode === 'pause'
              ? handlePaused
              : overlay.mode === 'archive'
                ? handleArchived
                : handleUnarchived
          }
        />
      ) : null}
      {confirmingWithdraw ? (
        <ConfirmDialog
          titleKey="template.withdrawConfirmTitle"
          bodyKey="template.withdrawConfirmBody"
          confirmKey="template.withdrawConfirmAction"
          busy={withdrawing}
          onConfirm={() => void handleWithdraw()}
          onClose={() => setConfirmingWithdraw(false)}
        />
      ) : null}
    </PageShell>
  );
}
