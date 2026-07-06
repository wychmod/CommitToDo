import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { container } from '../../core/di/injection-container';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { useTaskStore } from '../stores/task-store';

/**
 * `/task/:id` is a legacy alias kept for backwards compatibility. The design
 * prefers opening tasks inside the right-side detail drawer at
 * `/repository/:id?task=:taskId`, so we resolve the task's repository and
 * redirect transparently.
 */
export function TaskDetailScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { load, task } = useTaskStore();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async (): Promise<void> => {
      await load(id);
      if (cancelled) return;
      const current = useTaskStore.getState().task;
      if (!current) {
        navigate('/workspace', { replace: true });
        return;
      }
      const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');
      const branch = await branchRepo.getById(current.branchId);
      if (cancelled) return;
      if (!branch) {
        navigate('/workspace', { replace: true });
        return;
      }
      navigate(
        `/repository/${branch.repositoryId}?branch=${branch.id}&task=${current.id}`,
        { replace: true }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [id, load, navigate]);

  if (!task) {
    return (
      <div className="work-main">
        <div className="work-main-pad">
          <div className="empty-state">
            <span className="empty-state-title">正在定位任务…</span>
            <span className="empty-state-caption">
              会自动跳转到该任务所在的仓库。
            </span>
          </div>
        </div>
      </div>
    );
  }
  return <div />;
}

// Side-effect import: ensure task/branch/commit repositories get resolved at
// least once so the redirect chain above doesn't catch a cold cache.
void container.resolve<ITaskRepository>('ITaskRepository');
void container.resolve<ICommitRepository>('ICommitRepository');
