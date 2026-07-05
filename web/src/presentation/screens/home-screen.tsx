import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { useHomeStore } from '../stores/home-store';
import { AppButton } from '../components/common/app-button';
import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '../components/common/app-dialog';
import { AppInput } from '../components/common/app-input';

import { HudTopbar } from '../components/home/hud-topbar';
import { HeroBlock } from '../components/home/hero-block';
import { StatsGrid } from '../components/home/stats-grid';
import { RepoRow } from '../components/home/repo-row';
import { QuickActions } from '../components/home/quick-actions';

import { cn } from '../../core/utils/formatters';

const PRODUCT_TITLE = 'CommitToDo';
const PRODUCT_TAGLINE = '记录每一次提交，绘制你的节奏';

export function HomeScreen(): JSX.Element {
  const navigate = useNavigate();
  const {
    repositories,
    isLoading,
    error,
    load,
    createRepository,
    deleteRepository,
    clearError,
  } = useHomeStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (): Promise<void> => {
    const created = await createRepository(newName);
    if (created) {
      setNewName('');
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-lg">
      <HudTopbar />

      <HeroBlock title={PRODUCT_TITLE} subtitle={PRODUCT_TAGLINE} />

      <StatsGrid repositories={repositories} />

      {/* Accent line under stats — quiet but signals the transition */}
      <div className="accent-line hud-rise hud-stagger-4" aria-hidden />

      {/* Workspace section */}
      <section
        className="flex flex-col gap-md hud-rise hud-stagger-4"
        aria-label="仓库列表"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <span className="inline-flex h-5 items-center rounded-sm border border-primary/40 bg-primary/10 px-2 text-mono-sm font-medium text-primary">
              02
            </span>
            <h2 className="text-headline font-semibold text-ink">
              <span className="text-ink-muted">[ </span>WORKSPACE
              <span className="text-ink-muted"> ]</span>
            </h2>
            <span className="text-mono-sm text-ink-tertiary">
              / {repositories.length} repos
            </span>
          </div>
          <span className="text-mono-sm text-ink-subtle tablet:hidden">
            <span>&gt;</span>
            <span className="hud-dot">·</span>
            <span className="hud-dot">·</span>
            <span className="hud-dot">·</span>
            <span className="hud-dot ml-xs">ready</span>
          </span>
        </header>

        {/* Error notice */}
        {error ? (
          <div className="flex items-center justify-between rounded-md border border-error/40 bg-error/10 px-md py-sm text-body text-error">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-body-sm underline underline-offset-2 hover:opacity-80"
            >
              清除
            </button>
          </div>
        ) : null}

        {/* Loading skeletons */}
        {isLoading && repositories.length === 0 ? (
          <div className="flex flex-col gap-xs">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-16 rounded-lg border border-hairline bg-surface-1',
                  'animate-pulse'
                )}
                style={{ animationDelay: `${i * 80}ms` }}
                aria-hidden
              />
            ))}
          </div>
        ) : null}

        {/* Empty state */}
        {!isLoading && repositories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-md rounded-xl border border-dashed border-hairline-strong bg-canvas px-lg py-section text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-hairline bg-surface-1 text-ink-muted hud-glow">
              <Plus className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <div className="flex flex-col gap-xs">
              <h3 className="text-headline font-semibold text-ink">
                还没建仓库
              </h3>
              <p className="max-w-sm text-body text-ink-muted">
                建一个仓库开始追踪你的提交节奏。每个仓库会自动初始化 main 分支。
              </p>
            </div>
            <AppButton onClick={() => setIsCreateOpen(true)} size="lg">
              <Plus className="h-4 w-4" />
              创建第一个仓库
            </AppButton>
          </div>
        ) : null}

        {/* Repository rows */}
        {repositories.length > 0 ? (
          <div className="flex flex-col gap-xs">
            {repositories.map((repo) => (
              <RepoRow
                key={repo.id}
                repository={repo}
                onClick={() => navigate(`/repository/${repo.id}`)}
                onDelete={() => deleteRepository(repo.id)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <QuickActions onCreateRepository={() => setIsCreateOpen(true)} />

      {/* Create dialog */}
      <AppDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>新建仓库</AppDialogTitle>
            <AppDialogDescription>
              输入仓库名称，系统会自动创建 main 分支。
            </AppDialogDescription>
          </AppDialogHeader>
          <AppInput
            placeholder="例如 web-app"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !isLoading) {
                void handleCreate();
              }
            }}
          />
          <AppDialogFooter>
            <AppButton
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              取消
            </AppButton>
            <AppButton
              onClick={handleCreate}
              disabled={!newName.trim() || isLoading}
            >
              {isLoading ? '创建中…' : '创建'}
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}
