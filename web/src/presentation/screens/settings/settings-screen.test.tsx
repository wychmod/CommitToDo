import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { SettingsScreen } from './settings-screen';
import { SettingsScreenStore } from './settings-screen-store';

const mockLoad = vi.fn();
const mockSetScope = vi.fn();
const mockRefreshSaveStatus = vi.fn();
const mockRequestNotificationPermission = vi.fn();
const mockExportData = vi.fn();
const mockOpenImportDialog = vi.fn();
const mockUpdateCurrentRepository = vi.fn();
const mockArchiveCurrentRepository = vi.fn();
const mockDeleteCurrentRepository = vi.fn();
const mockInstallPwa = vi.fn();
const mockSetDeferredPrompt = vi.fn();
const mockSetPwaInstalled = vi.fn();

let mockSettingsStoreState = {
  isDarkMode: true,
  themeMode: 'dark' as const,
  themeColor: '#80e48c',
  density: 'comfortable' as const,
  enableNotifications: true,
  reminderHours: 1,
  defaultLeadMinutes: 60,
  enableAutoBackup: false,
  setDarkMode: vi.fn(),
  setThemeMode: vi.fn(),
  setThemeColor: vi.fn(),
  setDensity: vi.fn(),
  setNotifications: vi.fn(),
  setReminderHours: vi.fn(),
  setDefaultLeadMinutes: vi.fn(),
  setAutoBackup: vi.fn(),
};

let mockScreenStoreState: Partial<SettingsScreenStore> = {
  scope: 'app',
  repositories: [],
  currentRepositoryId: null,
  branches: [],
  storageStatus: 'saved',
  storageSizeBytes: 2_500_000,
  lastSavedAt: new Date(),
  saveStatus: 'saved',
  pwaStatus: 'unsupported',
  deferredPrompt: null,
  importDialogOpen: false,
  importFileName: null,
  importJson: null,
  importPreview: null,
  importError: null,
  importExecuting: false,
  notificationPermission: 'granted' as NotificationPermission,
  isLoading: false,
  error: null,
  load: mockLoad,
  setScope: mockSetScope,
  refreshSaveStatus: mockRefreshSaveStatus,
  requestNotificationPermission: mockRequestNotificationPermission,
  exportData: mockExportData,
  openImportDialog: mockOpenImportDialog,
  closeImportDialog: vi.fn(),
  previewImportFile: vi.fn(),
  executeImport: vi.fn(),
  updateCurrentRepository: mockUpdateCurrentRepository,
  archiveCurrentRepository: mockArchiveCurrentRepository,
  deleteCurrentRepository: mockDeleteCurrentRepository,
  installPwa: mockInstallPwa,
  setDeferredPrompt: mockSetDeferredPrompt,
  setPwaInstalled: mockSetPwaInstalled,
};

vi.mock('@/presentation/components/v3', () => ({
  V3AppShell: ({ children }: { children: React.ReactNode }): JSX.Element => (
    <div data-testid="v3-app-shell">{children}</div>
  ),
  V3Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }): JSX.Element => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  V3Card: ({ children }: { children: React.ReactNode }): JSX.Element => (
    <div data-testid="v3-card">{children}</div>
  ),
}));

vi.mock('@/presentation/stores/settings-store', () => ({
  useSettingsStore: (
    selector: (state: typeof mockSettingsStoreState) => unknown
  ) => selector(mockSettingsStoreState),
}));

vi.mock('./settings-screen-store', () => ({
  useSettingsScreenStore: (
    selector?: (state: SettingsScreenStore) => unknown
  ) =>
    selector
      ? selector(mockScreenStoreState as SettingsScreenStore)
      : mockScreenStoreState,
  formatBytes: (bytes: number | null): string =>
    bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—',
  formatLastSaved: (): string => '刚刚保存',
}));

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/workspace" element={<div data-testid="workspace">Workspace</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenStoreState = {
      ...mockScreenStoreState,
      scope: 'app',
      currentRepositoryId: null,
      repositories: [],
      branches: [],
      saveStatus: 'saved',
      storageStatus: 'saved',
      notificationPermission: 'granted',
      pwaStatus: 'unsupported',
    };
  });

  it('renders title, scope segmented control and sections', () => {
    renderScreen();

    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText('应用')).toBeInTheDocument();
    expect(screen.getByText('工作区')).toBeInTheDocument();
    expect(screen.getAllByText('当前仓库').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('外观')).toBeInTheDocument();
    expect(screen.getByText('提醒')).toBeInTheDocument();
    expect(screen.getByText('数据与备份')).toBeInTheDocument();
    expect(screen.getByText('尚未选择仓库')).toBeInTheDocument();
  });

  it('switches scope when segmented control is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: '工作区' }));
    expect(mockSetScope).toHaveBeenCalledWith('workspace');
  });

  it('renders saved status text', () => {
    renderScreen();
    expect(screen.getByText('✓ 所有更改已保存')).toBeInTheDocument();
  });

  it('changes theme mode and updates settings store', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: '浅色' }));
    expect(mockSettingsStoreState.setThemeMode).toHaveBeenCalledWith('light');
  });

  it('changes accent color and updates preview', async () => {
    const user = userEvent.setup();
    renderScreen();

    const blueButton = screen.getByLabelText('选择蓝色强调色');
    await user.click(blueButton);
    expect(mockSettingsStoreState.setThemeColor).toHaveBeenCalledWith('#6e95ff');
  });

  it('changes density and updates settings store', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: '紧凑' }));
    expect(mockSettingsStoreState.setDensity).toHaveBeenCalledWith('compact');
  });

  it('disables lead time select when reminders are off', () => {
    mockSettingsStoreState = {
      ...mockSettingsStoreState,
      enableNotifications: false,
    };
    renderScreen();

    expect(screen.getByLabelText('默认提前时间')).toBeDisabled();
  });

  it('calls export services for JSON, CSV and Markdown', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '导出 JSON' }));
    await user.click(screen.getByRole('button', { name: '导出 CSV' }));
    await user.click(screen.getByRole('button', { name: '导出 Markdown' }));

    expect(mockExportData).toHaveBeenCalledWith('json');
    expect(mockExportData).toHaveBeenCalledWith('csv');
    expect(mockExportData).toHaveBeenCalledWith('markdown');
  });

  it('opens import dialog when import button is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '导入数据' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '导入数据' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('导入冲突策略')).toBeInTheDocument();
  });

  it('shows no current repository empty state', () => {
    renderScreen();

    expect(screen.getByText('尚未选择仓库')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择仓库' })).toBeInTheDocument();
  });

  it('shows repository section when current repository exists', () => {
    mockScreenStoreState = {
      ...mockScreenStoreState,
      currentRepositoryId: 'repo-1',
      repositories: [
        {
          id: 'repo-1',
          name: '运动计划',
          description: '把 5km 训练拆成可持续推进的分支',
          defaultBranchId: 'branch-1',
          icon: 'repository',
          color: '#80e48c',
          isArchived: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as import('@/domain/entities/repository').Repository,
      ],
      branches: [
        {
          id: 'branch-1',
          repositoryId: 'repo-1',
          name: 'main',
          isMain: true,
          color: '#80e48c',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as import('@/domain/entities/branch').Branch,
      ],
    };

    renderScreen();

    expect(screen.getByDisplayValue('运动计划')).toBeInTheDocument();
    expect(screen.getByDisplayValue('把 5km 训练拆成可持续推进的分支')).toBeInTheDocument();
    expect(screen.getByLabelText('默认分支')).toHaveValue('branch-1');
  });

  it('saves repository name on blur', async () => {
    mockScreenStoreState = {
      ...mockScreenStoreState,
      currentRepositoryId: 'repo-1',
      repositories: [
        {
          id: 'repo-1',
          name: '运动计划',
          description: null,
          defaultBranchId: 'branch-1',
          icon: 'repository',
          color: '#80e48c',
          isArchived: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as import('@/domain/entities/repository').Repository,
      ],
      branches: [],
    };

    const user = userEvent.setup();
    renderScreen();

    const nameInput = screen.getByDisplayValue('运动计划');
    await user.clear(nameInput);
    await user.type(nameInput, '新名称');
    await user.tab();

    expect(mockUpdateCurrentRepository).toHaveBeenCalledWith({ name: '新名称' });
  });

  it('shows PWA unsupported state by default', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: '当前浏览器不支持安装' })).toBeDisabled();
  });

  it('shows notification denied state', () => {
    mockScreenStoreState = {
      ...mockScreenStoreState,
      notificationPermission: 'denied',
    };
    renderScreen();

    expect(screen.getByText('已拒绝')).toBeInTheDocument();
  });

  it('shows IndexedDB unavailable state', () => {
    mockScreenStoreState = {
      ...mockScreenStoreState,
      storageStatus: 'unavailable',
    };
    renderScreen();

    expect(screen.getByText('本地数据不可用')).toBeInTheDocument();
  });

  it('calls load only once even when store state changes', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockLoad).toHaveBeenCalledTimes(1);
    });

    // Simulate a Zustand state update (new store reference) without changing
    // the stable action references. The load effect must not re-run.
    mockScreenStoreState = {
      ...mockScreenStoreState,
      scope: 'workspace',
    };

    rerender(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '工作区' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
