import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { systemClock, today } from '@/core/clock';
import { canCreateChild } from '@/core/rules/branch-hierarchy';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessCreateQuota } from '@/core/rules/branch-quota';
import { computeBranchProgress, type BranchProgress } from '@/core/rules/branch-progress';
import { branchTreeReadonlyReason } from '@/core/rules/branch-readonly';
import { finishEntryReason } from '@/core/rules/finish-precheck';
import { branchTrail } from '@/core/rules/quick-add';
import {
  useBranchCommits,
  useBranchHeader,
  useBranchMilestones,
  useBranchTasks,
} from '@/data/hooks';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import { BackButton } from '@/components/back-button';
import { BranchPanel, type BranchPanelState } from '@/components/branches/branch-panel';
import { BranchActions } from '@/components/branch-detail/branch-actions';
import { BranchChildrenSection } from '@/components/branch-detail/branch-children-section';
import { BranchCommitsSection } from '@/components/branch-detail/branch-commits-section';
import { BranchDeletePanel } from '@/components/branch-detail/branch-delete-panel';
import { BranchFinishPanel } from '@/components/branch-detail/branch-finish-panel';
import { BranchHeader } from '@/components/branch-detail/branch-header';
import { BranchMilestonesSection } from '@/components/branch-detail/branch-milestones-section';
import { BranchTasksSection } from '@/components/branch-detail/branch-tasks-section';
import styles from './branch-detail-page.module.css';

/** 新建子分支不可用的原因，与 P02 的菜单口径一致。 */
function createChildReasonKey(
  branch: Branch,
  branches: readonly Branch[],
  readonly: boolean,
): MessageKey | null {
  if (readonly) return 'branches.reason.readonly';
  if (!canCreateChild(branch.depth)) return 'branches.reason.depth';
  const quota = assessCreateQuota(branch.id, branch.depth, branches);
  if (quota.reason === 'parent-full') return 'branches.reason.parentFull';
  if (quota.reason === 'tree-full') return 'branches.reason.treeFull';
  return null;
}

/** 收尾入口不可用的原因；`null` 表示可收尾。 */
function finishReasonKey(
  branch: Branch,
  branches: readonly Branch[],
  readonly: boolean,
): MessageKey | null {
  if (readonly) return 'branches.reason.readonly';
  const parent = branch.parentId ? branches.find((row) => row.id === branch.parentId) : undefined;
  const descendants = collectSubtree(branches, branch.path).filter((row) => row.id !== branch.id);
  const reason = finishEntryReason(branch, parent, descendants);
  if (reason === null) return null;
  if (reason === 'parent-missing' || reason === 'parent-readonly') {
    return 'branches.reason.finishParent';
  }
  if (reason === 'unfinished-descendant') return 'branches.reason.finishChildren';
  return 'branches.reason.readonly';
}

type Overlay = 'finish' | 'delete' | null;

/**
 * P03 分支详情（PRD M04）。
 *
 * 页头单独读取，区块各自取数：任务、提交、里程碑互不遮挡。
 * 只读判定带祖先；所有写入都走用例，页面只负责编排。
 */
export function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const header = useBranchHeader(branchId);
  const tasks = useBranchTasks(branchId);
  const commits = useBranchCommits(branchId);
  const milestones = useBranchMilestones(branchId);
  const openTaskDetail = useShellStore((state) => state.openTaskDetail);
  const openQuickAdd = useShellStore((state) => state.openQuickAdd);
  const milestoneFocusId = useShellStore((state) => state.milestoneFocusId);
  const setMilestoneFocus = useShellStore((state) => state.setMilestoneFocus);
  const [panel, setPanel] = useState<BranchPanelState | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  // 保存里程碑后只短暂高亮，不长期驻留（M07 OP-07）。
  useEffect(() => {
    if (!milestoneFocusId) return;
    const timer = window.setTimeout(() => setMilestoneFocus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [milestoneFocusId, setMilestoneFocus]);

  const todayDate = today(systemClock);
  const byId = useMemo(
    () => new Map(header.branches.map((branch) => [branch.id, branch])),
    [header.branches],
  );

  if (header.status === 'loading') {
    return (
      <PageShell titleKey="page.branchDetail.title" back={<BackButton fallbackTo="/branches" />}>
        <LoadingShell />
      </PageShell>
    );
  }

  if (header.status === 'error' || !branchId) {
    return (
      <PageShell titleKey="page.branchDetail.title" back={<BackButton fallbackTo="/branches" />}>
        <div className={styles.notFound} role="alert">
          <p>{t('branchDetail.loadFailed')}</p>
          <div className={styles.notFoundActions}>
            <button type="button" className={styles.retry} onClick={header.retry}>
              {t('branchDetail.retry')}
            </button>
            <Link className={styles.backLink} to="/branches">
              {t('branchDetail.backToTree')}
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const branch = header.branch;
  if (!branch || branch.deletedAt !== null) {
    return (
      <PageShell titleKey="page.branchDetail.title" back={<BackButton fallbackTo="/branches" />}>
        <div className={styles.notFound}>
          <p>{t('branchDetail.notFound')}</p>
          <Link className={styles.backLink} to="/branches">
            {t('branchDetail.backToTree')}
          </Link>
        </div>
      </PageShell>
    );
  }

  const readonlyReason = branchTreeReadonlyReason(branch, byId);
  const createReason = createChildReasonKey(branch, header.branches, readonlyReason !== null);
  const finishReason = finishReasonKey(branch, header.branches, readonlyReason !== null);
  const canFinish = branch.depth > 0;
  const trail = branchTrail(branch, byId);
  const progress: BranchProgress =
    tasks.status === 'ready'
      ? computeBranchProgress(branch.id, tasks.tasks)
      : {
          done: branch.taskDone,
          total: branch.taskTotal,
          ratio: branch.taskTotal === 0 ? 0 : branch.taskDone / branch.taskTotal,
          hasProgress: branch.taskTotal > 0,
        };
  const backTarget = branch.parentId ? `/branches/${branch.parentId}` : '/branches';

  return (
    <PageShell
      back={<BackButton fallbackTo={backTarget} />}
      title={
        <BranchHeader branch={branch} branches={header.branches} readonlyReason={readonlyReason} />
      }
      action={
        <BranchActions
          createReason={createReason}
          readonly={readonlyReason !== null}
          showFinish={canFinish}
          finishReason={finishReason}
          showDelete={canFinish}
          deleteReason={readonlyReason !== null ? 'branches.reason.readonly' : null}
          onOpenCreate={() => setPanel({ mode: 'create', parent: branch })}
          onOpenRename={() => setPanel({ mode: 'rename', branch })}
          onOpenMove={() => setPanel({ mode: 'move', branch })}
          onOpenFinish={() => setOverlay('finish')}
          onOpenDelete={() => setOverlay('delete')}
        />
      }
    >
      <div className={styles.stack}>
        <div className={styles.progress} aria-label={t('branchDetail.progress.label')}>
          <div className={styles.progressHead}>
            <span className={styles.progressLabel}>{t('branchDetail.progress.label')}</span>
            <span className={styles.progressValue}>
              {progress.hasProgress
                ? `${progress.done} / ${progress.total}`
                : t('branchDetail.progress.empty')}
            </span>
          </div>
          {progress.hasProgress ? (
            <span className={styles.progressTrack} aria-hidden="true" data-status={tasks.status}>
              <span
                className={styles.progressBar}
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </span>
          ) : null}
        </div>

        <BranchTasksSection
          branch={branch}
          branchTrail={trail}
          tasks={tasks.tasks}
          status={tasks.status}
          retry={tasks.retry}
          readonlyReason={readonlyReason}
          todayDate={todayDate}
          onOpenTask={(task) => openTaskDetail(task.id)}
          onAddTask={() => openQuickAdd(branch.id)}
        />

        <BranchCommitsSection
          branchId={branch.id}
          commits={commits.commits}
          branches={header.branches}
          status={commits.status}
          retry={commits.retry}
        />

        <BranchChildrenSection
          branch={branch}
          branches={header.branches}
          createReason={createReason}
          onNewChild={() => setPanel({ mode: 'create', parent: branch })}
        />

        <BranchMilestonesSection
          branchId={branch.id}
          readonly={readonlyReason !== null}
          milestones={milestones.milestones}
          status={milestones.status}
          retry={milestones.retry}
        />
      </div>

      {panel ? (
        <BranchPanel
          state={panel}
          branches={header.branches.filter((row) => row.deletedAt === null)}
          onClose={() => setPanel(null)}
          onSaved={() => setPanel(null)}
        />
      ) : null}

      {overlay === 'finish' ? (
        <BranchFinishPanel
          branch={branch}
          branches={header.branches}
          onClose={() => setOverlay(null)}
          onFinished={() => setOverlay(null)}
        />
      ) : null}

      {overlay === 'delete' ? (
        <BranchDeletePanel
          branch={branch}
          branches={header.branches}
          onClose={() => setOverlay(null)}
          onDeleted={(parentId) => {
            setOverlay(null);
            navigate(parentId ? `/branches/${parentId}` : '/branches', { replace: true });
          }}
        />
      ) : null}
    </PageShell>
  );
}
