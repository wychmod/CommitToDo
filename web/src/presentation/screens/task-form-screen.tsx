import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppButton } from '../components/common/app-button';
import { TaskForm, TaskFormData } from '../components/tasks/task-form';
import { useRepositoryStore } from '../stores/repository-store';
import { useTaskStore } from '../stores/task-store';

export function TaskFormScreen(): JSX.Element {
  const { id, taskId } = useParams<{ id: string; taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(taskId);

  const { repository, branches, activeBranchId, loadData, createTask, updateTask } =
    useRepositoryStore();
  const { task, load: loadTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);

  const repositoryId = id ?? repository?.id;
  const branchId =
    searchParams.get('branchId') ??
    activeBranchId ??
    task?.branchId ??
    null;

  useEffect(() => {
    if (repositoryId) void loadData(repositoryId);
  }, [repositoryId, loadData]);

  useEffect(() => {
    if (isEdit && taskId) {
      void loadTask(taskId);
    }
  }, [isEdit, taskId, loadTask]);

  const branch = branches.find((b) => b.id === branchId) ?? null;

  const handleSubmit = async (data: TaskFormData): Promise<void> => {
    setIsLoading(true);
    try {
      if (isEdit && taskId) {
        await updateTask(taskId, {
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: data.status,
        });
        // Return to repository detail
        navigate(
          repositoryId
            ? `/repository/${repositoryId}?branch=${task?.branchId ?? branchId ?? ''}&task=${taskId}`
            : '/workspace'
        );
      } else if (branchId) {
        await createTask({
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          parentTaskId: null,
        });
        navigate(
          repositoryId
            ? `/repository/${repositoryId}?branch=${branchId}`
            : '/workspace'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="work-main">
      <div className="work-main-pad page-container">
        <header className="flex flex-wrap items-end justify-between gap-md">
          <div className="flex flex-col gap-xs">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
              {isEdit ? 'Edit task' : 'New task'}
            </span>
            <h1 className="text-[22px] font-semibold leading-tight text-ink">
              {isEdit ? '编辑任务' : '新建任务'}
            </h1>
            {branch ? (
              <p className="font-mono text-[12px] text-ink-muted">
                分支 · {branch.name}
              </p>
            ) : null}
          </div>
          <AppButton variant="secondary" onClick={() => navigate(-1)}>
            返回
          </AppButton>
        </header>
        <section className="panel">
          <header className="panel-header">
            <span className="panel-title">{isEdit ? '修改任务信息' : '任务信息'}</span>
          </header>
          <div className="panel-body">
            <TaskForm
              task={task}
              branchName={branch?.name}
              onSubmit={handleSubmit}
              onCancel={() => navigate(-1)}
              isLoading={isLoading}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
