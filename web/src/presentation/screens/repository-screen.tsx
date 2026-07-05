import { ArrowLeft, ChevronRight, GitMerge, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useIsWide } from '../../core/hooks/use-is-wide';
import { Branch } from '../../domain/entities/branch';
import { AppButton } from '../components/common/app-button';
import { AppDialog, AppDialogContent, AppDialogFooter, AppDialogHeader, AppDialogTitle, AppDialogDescription } from '../components/common/app-dialog';
import { AppInput } from '../components/common/app-input';
import { SplitView } from '../components/common/split-view';
import { BranchList } from '../components/branch/branch-list';
import { TaskList } from '../components/task/task-list';
import { useRepositoryStore } from '../stores/repository-store';

export function RepositoryScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isWide = useIsWide();
  const {
    repository,
    branches,
    tasks,
    activeBranchId,
    isLoading,
    error,
    loadData,
    switchBranch,
    createBranch,
    mergeBranch,
    deleteBranch,
    completeTask,
    clearError,
  } = useRepositoryStore();

  const [showTasks, setShowTasks] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  useEffect(() => {
    if (id) {
      loadData(id);
      setShowTasks(false);
    }
  }, [id, loadData]);

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  const handleBranchSelect = (branch: Branch) => {
    switchBranch(branch.id);
    if (!isWide) {
      setShowTasks(true);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !activeBranch) return;
    const created = await createBranch(newBranchName.trim(), {
      parentBranchId: activeBranch.id,
      color: activeBranch.color,
    });
    if (created) {
      setNewBranchName('');
      setIsBranchDialogOpen(false);
    }
  };

  const masterContent = (
    <div className="flex h-full flex-col gap-md">
      <div className="flex items-center gap-xs">
        <Link
          to="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-1 hover:text-ink"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-headline font-semibold text-ink">
          {repository?.name ?? '仓库'}
        </h1>
      </div>
      {error ? (
        <div className="rounded-md border border-error bg-error/10 p-md text-body text-error">
          {error}
          <button type="button" onClick={clearError} className="ml-sm text-body-sm underline">
            清除
          </button>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-eyebrow text-ink-muted">分支</span>
        <AppButton
          size="sm"
          variant="secondary"
          onClick={() => setIsBranchDialogOpen(true)}
          disabled={!activeBranch}
        >
          <Plus className="h-4 w-4" />
          新建分支
        </AppButton>
      </div>
      {isLoading && branches.length === 0 ? (
        <p className="py-lg text-center text-body text-ink-muted">加载中…</p>
      ) : (
        <BranchList
          branches={branches}
          activeBranchId={activeBranchId}
          onSelect={handleBranchSelect}
        />
      )}

      <AppDialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>新建分支</AppDialogTitle>
            <AppDialogDescription>从当前分支派生出新分支。</AppDialogDescription>
          </AppDialogHeader>
          <AppInput
            placeholder="分支名称"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            autoFocus
          />
          <AppDialogFooter>
            <AppButton variant="secondary" onClick={() => setIsBranchDialogOpen(false)}>
              取消
            </AppButton>
            <AppButton onClick={handleCreateBranch} disabled={!newBranchName.trim() || isLoading}>
              创建
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );

  const detailContent = (
    <div className="flex h-full flex-col gap-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-xs">
          {!isWide ? (
            <button
              type="button"
              onClick={() => setShowTasks(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-1 hover:text-ink"
              aria-label="返回分支列表"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h2 className="text-headline font-semibold text-ink">
            {activeBranch?.name ?? '任务'}
          </h2>
        </div>
        <AppButton
          size="sm"
          onClick={() => navigate(`/repository/${id}/task/new?repoId=${id}&branchId=${activeBranchId ?? ''}`)}
          disabled={!activeBranchId}
        >
          <Plus className="h-4 w-4" />
          新建任务
        </AppButton>
      </div>
      {activeBranch && (
        <div className="flex items-center gap-xs text-body-sm text-ink-muted">
          <span className="font-mono">{tasks.length} 个任务</span>
          {!activeBranch.isMain && (
            <>
              <button
                type="button"
                onClick={async () => {
                  const main = branches.find((b) => b.isMain);
                  if (main) {
                    await mergeBranch(activeBranch.id, main.id);
                  }
                }}
                className="ml-auto inline-flex items-center gap-micro text-primary hover:underline"
              >
                <GitMerge className="h-4 w-4" />
                合并到 main
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteBranch(activeBranch.id);
                }}
                className="inline-flex items-center gap-micro text-error hover:underline"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </>
          )}
        </div>
      )}
      <TaskList
        tasks={tasks}
        onItemClick={(task) => navigate(`/task/${task.id}`)}
        onToggleComplete={(task) => completeTask(task.id)}
      />
    </div>
  );

  if (!isWide && showTasks) {
    return detailContent;
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      <SplitView
        master={masterContent}
        detail={detailContent}
        detailVisible={isWide}
        emptyDetail={
          <div className="flex h-full flex-col items-center justify-center text-ink-muted">
            <ChevronRight className="h-8 w-8" />
            <p className="mt-sm text-body">选择一个分支查看任务</p>
          </div>
        }
      />
    </div>
  );
}
