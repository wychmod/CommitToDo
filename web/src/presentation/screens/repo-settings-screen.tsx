import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Save,
  Trash2,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { container } from '../../core/di/injection-container';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { useRepositoryStore } from '../stores/repository-store';
import { Repository } from '../../domain/entities/repository';
import { AppButton } from '../components/common/app-button';
import { AppInput } from '../components/common/app-input';

/**
 * Per-repository settings (placeholder for the future archive / collaboration
 * controls). Mirrors the sectioning style of the global settings screen.
 */
export function RepoSettingsScreen(): JSX.Element {
  const { id: repoId } = useParams<{ id: string }>();
  const { repository, loadData } = useRepositoryStore();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (repoId) void loadData(repoId);
  }, [repoId, loadData]);

  useEffect(() => {
    if (repository) setName(repository.name);
  }, [repository]);

  const handleSave = async (): Promise<void> => {
    if (!repository || !name.trim()) return;
    setStatus('保存中…');
    try {
      const repo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
      const updated = await repo.update(
        new Repository({
          ...repository,
          name: name.trim(),
        })
      );
      if (updated) {
        setStatus('已保存');
        void loadData(updated.id);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleArchiveToggle = async (): Promise<void> => {
    if (!repository) return;
    const repo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
    await repo.update(
      new Repository({ ...repository, isArchived: !repository.isArchived })
    );
    void loadData(repository.id);
  };

  const handleDelete = async (): Promise<void> => {
    if (!repository) return;
    if (!window.confirm(`确定删除仓库 ${repository.name} 吗？此操作不可撤销。`)) return;
    const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');
    const branches = await branchRepo.getByRepositoryId(repository.id);
    for (const b of branches) await branchRepo.delete(b.id);
    const repoRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
    await repoRepo.delete(repository.id);
    window.location.assign('/workspace');
  };

  if (!repository) {
    return (
      <div className="work-main">
        <div className="work-main-pad">
          <div className="empty-state">
            <span className="empty-state-title">仓库未加载</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-main">
      <div className="work-main-pad">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            Repository Settings
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">
            {repository.name}
          </h1>
          <p className="font-mono text-[12px] text-ink-muted">
            仓库级设置将影响所有分支与任务。
          </p>
        </header>

        <section className="setting-section">
          <header className="setting-section-header">
            <h2 className="setting-section-title">基本信息</h2>
          </header>
          <div className="setting-section-body">
            <div className="setting-row">
              <span className="setting-row-label">仓库名称</span>
              <div className="flex items-center gap-sm">
                <AppInput value={name} onChange={(e) => setName(e.target.value)} />
                <AppButton onClick={() => void handleSave()}>
                  <Save className="h-4 w-4" /> 保存
                </AppButton>
              </div>
            </div>
            {status ? (
              <p className="font-mono text-[12px] text-ink-muted">{status}</p>
            ) : null}
          </div>
        </section>

        <section className="setting-section">
          <header className="setting-section-header">
            <h2 className="setting-section-title">生命周期</h2>
          </header>
          <div className="setting-section-body">
            <div className="setting-row">
              <div className="flex flex-col gap-xxs">
                <span className="setting-row-label">归档</span>
                <span className="setting-row-help">
                  归档后仓库仍保留数据，但不再出现在快速入口。
                </span>
              </div>
              <AppButton variant="secondary" onClick={() => void handleArchiveToggle()}>
                <Archive className="h-4 w-4" />
                {repository.isArchived ? '取消归档' : '归档此仓库'}
              </AppButton>
            </div>
          </div>
        </section>

        <section className="setting-section" style={{ borderColor: 'var(--color-danger-soft)' }}>
          <header className="setting-section-header">
            <h2 className="setting-section-title flex items-center gap-sm text-error">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> 危险操作
            </h2>
          </header>
          <div className="setting-section-body">
            <div className="setting-row">
              <div className="flex flex-col gap-xxs">
                <span className="setting-row-label">删除仓库</span>
                <span className="setting-row-help">
                  将永久删除该仓库的所有分支与任务。
                </span>
              </div>
              <AppButton variant="secondary" onClick={() => void handleDelete()}>
                <Trash2 className="h-4 w-4 text-error" /> 删除
              </AppButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
