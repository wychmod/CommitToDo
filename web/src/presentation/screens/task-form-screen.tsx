import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppButton } from '../components/common/app-button';
import { TaskForm, TaskFormData } from '../components/task/task-form';
import { useRepositoryStore } from '../stores/repository-store';
import { useTaskStore } from '../stores/task-store';

export function TaskFormScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const { repository, branches, activeBranchId, loadData, createTask, updateTask } =
    useRepositoryStore();
  const { task, load: loadTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);

  const repositoryId = searchParams.get('repoId') ?? repository?.id;
  const branchId = searchParams.get('branchId') ?? activeBranchId;

  useEffect(() => {
    if (repositoryId) {
      loadData(repositoryId);
    }
  }, [repositoryId, loadData]);

  useEffect(() => {
    if (isEdit && id) {
      loadTask(id);
    }
  }, [isEdit, id, loadTask]);

  const branch = branches.find((b) => b.id === branchId) ?? null;

  const handleSubmit = async (data: TaskFormData) => {
    setIsLoading(true);
    try {
      if (isEdit && id) {
        await updateTask(id, {
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: data.status,
        });
        navigate(`/task/${id}`);
      } else if (branchId) {
        await createTask({
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          parentTaskId: null,
        });
        navigate(`/repository/${repositoryId}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-md flex items-center justify-between">
        <h1 className="text-headline font-semibold text-ink">
          {isEdit ? '编辑任务' : '新建任务'}
        </h1>
        <AppButton variant="secondary" onClick={() => navigate(-1)}>
          返回
        </AppButton>
      </div>
      <div className="rounded-lg border border-hairline bg-surface-1 p-md">
        <TaskForm
          task={task}
          branchName={branch?.name}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
