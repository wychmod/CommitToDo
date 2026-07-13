import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import {
  Cloud,
  Shield,
  Wifi,
  User,
  LogIn,
} from 'lucide-react';

import { useShallow } from 'zustand/react/shallow';

import { V3AppShell, V3Button, V3Card } from '@/presentation/components/v3';
import { useSettingsScreenStore } from './settings-screen-store';
import { SettingsSegmentedControl } from './settings-segmented-control';
import { AppearanceSection } from './appearance-section';
import { RemindersSection } from './reminders-section';
import { DataSection } from './data-section';
import { RepositorySection } from './repository-section';
import { PwaInstallButton } from './pwa-install-button';

export function SettingsScreen(): JSX.Element {
  const {
    scope,
    repositories,
    currentRepositoryId,
    branches,
    storageStatus,
    storageSizeBytes,
    lastSavedAt,
    saveStatus,
    pwaStatus,
    notificationPermission,
    load,
    setScope,
    refreshSaveStatus,
    requestNotificationPermission,
    exportData,
    updateCurrentRepository,
    archiveCurrentRepository,
    deleteCurrentRepository,
    installPwa,
    setDeferredPrompt,
    setPwaInstalled,
  } = useSettingsScreenStore(
    useShallow((state) => ({
      scope: state.scope,
      repositories: state.repositories,
      currentRepositoryId: state.currentRepositoryId,
      branches: state.branches,
      storageStatus: state.storageStatus,
      storageSizeBytes: state.storageSizeBytes,
      lastSavedAt: state.lastSavedAt,
      saveStatus: state.saveStatus,
      pwaStatus: state.pwaStatus,
      notificationPermission: state.notificationPermission,
      load: state.load,
      setScope: state.setScope,
      refreshSaveStatus: state.refreshSaveStatus,
      requestNotificationPermission: state.requestNotificationPermission,
      exportData: state.exportData,
      updateCurrentRepository: state.updateCurrentRepository,
      archiveCurrentRepository: state.archiveCurrentRepository,
      deleteCurrentRepository: state.deleteCurrentRepository,
      installPwa: state.installPwa,
      setDeferredPrompt: state.setDeferredPrompt,
      setPwaInstalled: state.setPwaInstalled,
    }))
  );

  // Load settings once on mount. The whole store must NOT be a dependency,
  // because Zustand returns a new object reference on every state change,
  // which would cause this effect to run again and create an infinite loop.
  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event): void => {
      e.preventDefault();
      const prompt = e as unknown as {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      setDeferredPrompt(prompt);
    };

    const handleAppInstalled = (): void => {
      setPwaInstalled();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(
          'beforeinstallprompt',
          handleBeforeInstallPrompt
        );
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, [setDeferredPrompt, setPwaInstalled]);

  const currentRepository = React.useMemo(
    () => repositories.find((r) => r.id === currentRepositoryId) ?? null,
    [repositories, currentRepositoryId]
  );

  const saveStatusText = getSaveStatusText(saveStatus);
  const saveStatusColor = getSaveStatusColor(saveStatus);

  const scopeOptions = [
    { value: 'app' as const, label: '应用' },
    { value: 'workspace' as const, label: '工作区' },
    { value: 'repository' as const, label: '当前仓库' },
  ];

  const handleSaved = (): void => {
    refreshSaveStatus();
  };

  return (
    <V3AppShell currentRepositoryId={currentRepositoryId ?? undefined}>
      <div className="flex min-h-[calc(100vh-var(--v3-app-chrome))]">
        {/* Central settings area */}
        <div className="flex-1 px-6 py-8 desktop:px-10">
          <header className="flex flex-col gap-2 desktop:flex-row desktop:items-start desktop:justify-between">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--v3-primary)]">
                Settings
              </span>
              <h1 className="mt-1 text-[42px] font-bold leading-[1.05] text-[var(--v3-text-strong)]">
                设置
              </h1>
              <p className="mt-2 text-[15px] text-[var(--v3-text-secondary)]">
                管理外观、提醒、本地数据和仓库。
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 desktop:items-end">
              <SettingsSegmentedControl
                ariaLabel="设置范围"
                options={scopeOptions}
                value={scope}
                onChange={(value) => setScope(value)}
              />
              <span
                className="text-[13px]"
                style={{ color: saveStatusColor }}
                aria-live="polite"
              >
                {saveStatusText}
              </span>
            </div>
          </header>

          <div className="mt-10 flex max-w-[960px] flex-col gap-10">
            {(scope === 'app' || scope === 'workspace') && (
              <>
                <AppearanceSection onSaved={handleSaved} />
                <RemindersSection
                  notificationPermission={notificationPermission}
                  onRequestPermission={requestNotificationPermission}
                  onSaved={handleSaved}
                />
                <DataSection
                  storageStatus={storageStatus}
                  storageSizeBytes={storageSizeBytes}
                  lastSavedAt={lastSavedAt}
                  onExport={exportData}
                />
              </>
            )}

            {(scope === 'app' || scope === 'repository') && (
              <RepositorySection
                repository={currentRepository}
                branches={branches}
                onUpdate={updateCurrentRepository}
                onArchive={archiveCurrentRepository}
                onDelete={deleteCurrentRepository}
                onSaved={handleSaved}
              />
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <aside
          className="hidden w-[319px] shrink-0 border-l border-[var(--v3-border-soft)] bg-[var(--v3-sidebar)] px-6 py-8 laptop:block"
          aria-label="设置说明"
        >
          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
                本地优先
              </h3>
              <p className="mt-1 text-[13px] leading-[1.55] text-[var(--v3-text-secondary)]">
                所有数据都保存在当前设备，优先保障离线可用与隐私安全。
              </p>
            </div>

            <V3Card className="flex flex-col gap-5 p-5">
              <InfoItem
                icon={<Wifi size={18} strokeWidth={1.5} aria-hidden="true" />}
                title="离线可用"
                description="无需网络即可创建、编辑和查看任务。"
              />
              <InfoItem
                icon={<Shield size={18} strokeWidth={1.5} aria-hidden="true" />}
                title="数据安全"
                description="默认存储在本地，并受到浏览器加密保护。"
              />
              <InfoItem
                icon={<Cloud size={18} strokeWidth={1.5} aria-hidden="true" />}
                title="PWA 可安装"
                description="安装为应用，随时随地快速访问。"
              />
            </V3Card>

            <PwaInstallButton status={pwaStatus} onInstall={installPwa} />

            <V3Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--v3-control)] text-[var(--v3-primary)]">
                  <User size={18} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
                    账户
                  </p>
                  <p className="text-[13px] text-[var(--v3-text-secondary)]">
                    本地模式
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-[var(--v3-text-secondary)]">
                当前使用本地模式，数据仅保存在此设备。
              </p>
              <V3Button variant="secondary" className="w-full" disabled
              >
                <LogIn size={16} strokeWidth={1.5} aria-hidden="true" />
                登录
              </V3Button>
            </V3Card>
          </div>
        </aside>
      </div>
    </V3AppShell>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function InfoItem({ icon, title, description }: InfoItemProps): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--v3-control)] text-[var(--v3-primary)]">
        {icon}
      </span>
      <div>
        <p className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-[1.5] text-[var(--v3-text-secondary)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function getSaveStatusText(status: 'saved' | 'saving' | 'error' | 'offline'): string {
  switch (status) {
    case 'saved':
      return '✓ 所有更改已保存';
    case 'saving':
      return '正在保存…';
    case 'error':
      return '保存失败，点击重试';
    case 'offline':
      return '离线可用，本地更改已保存';
    default:
      return '';
  }
}

function getSaveStatusColor(status: 'saved' | 'saving' | 'error' | 'offline'): string {
  switch (status) {
    case 'saved':
      return 'var(--v3-success)';
    case 'saving':
      return 'var(--v3-warning)';
    case 'error':
      return 'var(--v3-danger)';
    case 'offline':
      return 'var(--v3-text-secondary)';
    default:
      return 'var(--v3-text-secondary)';
  }
}
