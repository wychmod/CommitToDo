/**
 * Local data ownership screen.
 *
 * Appears when the browser has legacy IndexedDB data without an owner or when
 * the logged-in principal does not match the local owner.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/presentation/stores/auth-store';
import type { LocalWorkspaceResolution } from '@/application/usecases/auth/resolve-local-workspace-usecase';

export function LocalDataOwnershipScreen(): JSX.Element {
  const navigate = useNavigate();
  const {
    profile,
    resolveLocalWorkspace,
    claimLocalWorkspace,
    createLocalWorkspace,
    signOut,
  } = useAuthStore();
  const [resolution, setResolution] = React.useState<LocalWorkspaceResolution | null>(null);

  React.useEffect(() => {
    void resolveLocalWorkspace().then(setResolution);
  }, [resolveLocalWorkspace]);

  const principalId = profile?.principalId;

  const handleClaim = async (): Promise<void> => {
    if (!principalId) return;
    const requiresReload = await claimLocalWorkspace(principalId);
    if (requiresReload) window.location.reload();
    else navigate('/workspace', { replace: true });
  };

  const handleCreateNew = async (): Promise<void> => {
    if (!principalId) return;
    const requiresReload = await createLocalWorkspace(principalId);
    if (requiresReload) window.location.reload();
    else navigate('/workspace', { replace: true });
  };

  const handleSwitchAccount = async (): Promise<void> => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!resolution) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--v3-bg)]">
        <span className="auth-spinner h-6 w-6" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--v3-bg)] px-6 py-12">
      <div className="w-full max-w-md rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-6 shadow-[var(--v3-shadow-panel)]">
        <h1 className="text-[22px] font-bold text-[var(--v3-text-strong)]">
          本地数据归属
        </h1>
        <p className="mt-2 text-[14px] text-[var(--v3-text-secondary)]">
          你的账户与当前设备上的本地工作区需要建立关联。
        </p>

        {resolution.type === 'claim-pending' && (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] text-[var(--v3-text-secondary)]">
              检测到已有本地数据：{resolution.summary.repositoryCount} 个仓库，
              {resolution.summary.taskCount} 个任务。
            </p>
            <button
              type="button"
              onClick={() => void handleClaim()}
              className="flex h-12 w-full items-center justify-center rounded-[var(--v3-radius-md)] bg-[var(--v3-primary)] text-[14px] font-semibold text-[var(--v3-text-on-primary)]"
            >
              关联到当前账户
            </button>
            <button
              type="button"
              onClick={() => void handleCreateNew()}
              className="flex h-12 w-full items-center justify-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-control)] text-[14px] text-[var(--v3-text)]"
            >
              创建空白工作区
            </button>
          </div>
        )}

        {resolution.type === 'claimed-by-other' && (
          <div className="mt-5 space-y-3">
            <p className="text-[13px] text-[var(--v3-text-secondary)]">
              当前设备上的本地数据已属于其他账户。你可以切换回原账户，或创建独立的本地工作区。
            </p>
            <button
              type="button"
              onClick={() => void handleSwitchAccount()}
              className="flex h-12 w-full items-center justify-center rounded-[var(--v3-radius-md)] bg-[var(--v3-primary)] text-[14px] font-semibold text-[var(--v3-text-on-primary)]"
            >
              切换回原账户
            </button>
            <button
              type="button"
              onClick={() => void handleCreateNew()}
              className="flex h-12 w-full items-center justify-center rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-control)] text-[14px] text-[var(--v3-text)]"
            >
              为当前账户创建独立工作区
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
