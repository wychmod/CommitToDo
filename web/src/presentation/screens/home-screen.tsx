import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../components/common/app-button';
import { AppDialog, AppDialogContent, AppDialogFooter, AppDialogHeader, AppDialogTitle, AppDialogDescription } from '../components/common/app-dialog';
import { AppInput } from '../components/common/app-input';
import { HeroEmptyState } from '../components/common/hero-empty-state';
import { RepositoryList } from '../components/repository/repository-list';
import { AppIconName } from '../icons/app-icons';
import { useHomeStore } from '../stores/home-store';

export function HomeScreen(): JSX.Element {
  const navigate = useNavigate();
  const { repositories, isLoading, error, load, createRepository, deleteRepository, clearError } =
    useHomeStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const created = await createRepository(newName);
    if (created) {
      setNewName('');
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-md">
      <div className="flex items-center justify-between">
        <h1 className="text-display-md font-semibold text-ink">仓库</h1>
        <AppButton
          onClick={() => setIsCreateOpen(true)}
          className="hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          新建仓库
        </AppButton>
      </div>

      {error ? (
        <div className="rounded-md border border-error bg-error/10 p-md text-body text-error">
          {error}
          <button
            type="button"
            onClick={clearError}
            className="ml-sm text-body-sm underline"
          >
            清除
          </button>
        </div>
      ) : null}

      {isLoading && repositories.length === 0 ? (
        <p className="py-lg text-center text-body text-ink-muted">加载中…</p>
      ) : repositories.length === 0 ? (
        <HeroEmptyState
          icon={AppIconName.repository}
          title="从创建第一个仓库开始"
          description="仓库对应一个项目。每个仓库会自动创建 main 分支，你可以在其中管理任务。"
          action={
            <AppButton onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              新建仓库
            </AppButton>
          }
        />
      ) : (
        <RepositoryList
          repositories={repositories}
          onItemClick={(repo) => navigate(`/repository/${repo.id}`)}
          onItemDelete={(repo) => deleteRepository(repo.id)}
        />
      )}

      <AppDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>新建仓库</AppDialogTitle>
            <AppDialogDescription>输入仓库名称，系统将自动创建 main 分支。</AppDialogDescription>
          </AppDialogHeader>
          <AppInput
            placeholder="仓库名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <AppDialogFooter>
            <AppButton variant="secondary" onClick={() => setIsCreateOpen(false)}>
              取消
            </AppButton>
            <AppButton onClick={handleCreate} disabled={!newName.trim() || isLoading}>
              创建
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}
