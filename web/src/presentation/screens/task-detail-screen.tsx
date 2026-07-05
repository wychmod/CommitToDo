import { ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CommitType, Priority, TaskStatus } from '../../domain/entities/enums';
import { formatDateTime, formatRelativeTime } from '../../core/utils/formatters';
import { AppBadge } from '../components/common/app-badge';
import { AppButton } from '../components/common/app-button';
import { AppDialog, AppDialogContent, AppDialogFooter, AppDialogHeader, AppDialogTitle, AppDialogDescription } from '../components/common/app-dialog';
import { AppSegmentedControl } from '../components/common/app-segmented-control';
import { AppIcon, AppIconName } from '../icons/app-icons';
import { useTaskStore } from '../stores/task-store';

export function TaskDetailScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { task, commits, isLoading, error, load, completeTask, deleteTask, clearError } =
    useTaskStore();
  const [showDelete, setShowDelete] = useState(false);
  const [filterType, setFilterType] = useState<CommitType | 'all'>('all');

  useEffect(() => {
    if (id) {
      load(id);
    }
  }, [id, load]);

  const handleDelete = async () => {
    await deleteTask();
    setShowDelete(false);
    navigate(-1);
  };

  if (isLoading && !task) {
    return <p className="py-lg text-center text-body text-ink-muted">加载中…</p>;
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center gap-md py-lg">
        <p className="text-body text-ink-muted">任务不存在或已被删除</p>
        <Link to="/">
          <AppButton variant="secondary">返回首页</AppButton>
        </Link>
      </div>
    );
  }

  const filteredCommits =
    filterType === 'all'
      ? commits
      : commits.filter((commit) => commit.type === filterType);

  const commitFilterOptions = [
    { value: 'all', label: '全部' },
    { value: String(CommitType.create), label: '创建' },
    { value: String(CommitType.update), label: '更新' },
    { value: String(CommitType.merge), label: '合并' },
    { value: String(CommitType.complete), label: '完成' },
    { value: String(CommitType.delete), label: '删除' },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-1 hover:text-ink"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-headline font-semibold text-ink">任务详情</h1>
      </div>

      {error ? (
        <div className="rounded-md border border-error bg-error/10 p-md text-body text-error">
          {error}
          <button type="button" onClick={clearError} className="ml-sm text-body-sm underline">
            清除
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-hairline bg-surface-1 p-md">
        <div className="mb-md flex items-start justify-between gap-xs">
          <h2 className="text-display-md font-semibold text-ink">{task.title}</h2>
          <div className="flex items-center gap-xs">
            <AppButton
              size="icon"
              variant={task.status === TaskStatus.done ? 'secondary' : 'primary'}
              onClick={completeTask}
              aria-label="完成"
            >
              <CheckCircle2 className="h-5 w-5" />
            </AppButton>
            <AppButton
              size="icon"
              variant="danger"
              onClick={() => setShowDelete(true)}
              aria-label="删除"
            >
              <Trash2 className="h-5 w-5" />
            </AppButton>
          </div>
        </div>

        <div className="grid gap-sm text-body text-ink-muted sm:grid-cols-2">
          <div className="flex items-center gap-xs">
            <span className="text-eyebrow">状态</span>
            <AppBadge status={task.status}>{TaskStatus.label(task.status)}</AppBadge>
          </div>
          <div className="flex items-center gap-xs">
            <span className="text-eyebrow">优先级</span>
            <AppBadge priority={task.priority}>{Priority.label(task.priority)}</AppBadge>
          </div>
          {task.dueDate ? (
            <div className="flex items-center gap-xs">
              <span className="text-eyebrow">截止日期</span>
              <span className="font-mono">{formatDateTime(task.dueDate)}</span>
            </div>
          ) : null}
          {task.completedAt ? (
            <div className="flex items-center gap-xs">
              <span className="text-eyebrow">完成于</span>
              <span className="font-mono">{formatDateTime(task.completedAt)}</span>
            </div>
          ) : null}
        </div>

        {task.description ? (
          <div className="mt-md border-t border-hairline pt-md">
            <p className="whitespace-pre-wrap text-body text-ink">{task.description}</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-hairline bg-surface-1 p-md">
        <div className="mb-md flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-headline font-semibold text-ink">提交历史</h3>
          <AppSegmentedControl
            value={String(filterType === 'all' ? 'all' : filterType)}
            options={commitFilterOptions}
            onChange={(value) =>
              setFilterType(value === 'all' ? 'all' : CommitType.fromValue(Number(value)))
            }
          />
        </div>
        {filteredCommits.length === 0 ? (
          <p className="text-body text-ink-muted">暂无提交记录</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {filteredCommits.map((commit) => (
              <li
                key={commit.id}
                className="flex items-start gap-xs border-b border-hairline py-xs last:border-0"
              >
                <AppIcon
                  name={
                    commit.type === CommitType.create
                      ? AppIconName.gitCommit
                      : commit.type === CommitType.merge
                        ? AppIconName.gitMerge
                        : AppIconName.gitBranch
                  }
                  className="mt-0.5 h-4 w-4 text-ink-subtle"
                />
                <div className="flex flex-1 flex-col gap-micro">
                  <span className="text-body text-ink">{commit.message}</span>
                  <span className="font-mono text-mono-sm text-ink-subtle">
                    {CommitType.label(commit.type)} · {formatRelativeTime(commit.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AppDialog open={showDelete} onOpenChange={setShowDelete}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>删除任务</AppDialogTitle>
            <AppDialogDescription>任务将被移入回收站，可在设置中恢复。</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter>
            <AppButton variant="secondary" onClick={() => setShowDelete(false)}>
              取消
            </AppButton>
            <AppButton variant="danger" onClick={handleDelete}>
              删除
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}
