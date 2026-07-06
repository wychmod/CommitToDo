import { Moon, Sun, Download, Upload, Bell, BellOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { AppButton } from '../components/common/app-button';
import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '../components/common/app-dialog';
import { AppSegmentedControl } from '../components/common/app-segmented-control';
import { container } from '../../core/di/injection-container';
import { DataExportService } from '../../domain/services/data-export-service';
import { WebFileSaveService } from '../../platform/web-file-save-service';
import { WebNotificationService } from '../../platform/web-notification-service';
import { ImportDataUseCase } from '../../application/usecases/import-data-usecase';
import { useHomeStore } from '../stores/home-store';
import { defaultThemeColor } from '../stores/settings-store';

const themeColors = [
  defaultThemeColor,
  '#A7F542',
  '#FFC65C',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
];

export function SettingsScreen(): JSX.Element {
  const {
    isDarkMode,
    themeColor,
    enableNotifications,
    reminderHours,
    setDarkMode,
    setThemeColor,
    setNotifications,
    setReminderHours,
  } = useSettingsStore();

  const { load: reloadHome } = useHomeStore();
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const service = container.resolve(WebNotificationService);
    setNotificationPermission(service.getPermission());
  }, [enableNotifications]);

  const handleExport = async (format: 'json' | 'csv' | 'markdown'): Promise<void> => {
    setExportStatus('导出中…');
    try {
      const exportService = container.resolve(DataExportService);
      const fileService = container.resolve(WebFileSaveService);
      const data = await exportService.export(format);
      const extension = format === 'markdown' ? 'md' : format;
      fileService.save({
        content: data,
        filename: `commit-export.${extension}`,
        mimeType:
          format === 'json'
            ? 'application/json'
            : format === 'csv'
              ? 'text/csv'
              : 'text/markdown',
      });
      setExportStatus('导出成功');
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : '导出失败');
    }
  };

  const handleNotificationChange = async (value: boolean): Promise<void> => {
    if (value) {
      const service = container.resolve(WebNotificationService);
      const permission = await service.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotifications(true);
      } else {
        setNotifications(false);
        setImportStatus('通知权限被拒绝');
      }
    } else {
      setNotifications(false);
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('导入中…');
    try {
      const text = await file.text();
      const useCase = container.resolve(ImportDataUseCase);
      const result = await useCase.execute(text, importMode);
      setImportStatus(
        `导入成功：${result.repositories} 仓库、${result.branches} 分支、${result.tasks} 任务、${result.commits} 提交`
      );
      void reloadHome();
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : '导入失败');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="work-main">
      <div className="work-main-pad">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            Settings
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">设置</h1>
          <p className="text-[13px] text-ink-muted">
            主题、数据、同步、账号。所有内容均保存在本机。
          </p>
        </header>

        <Section title="外观 / Appearance">
          <Row label="深色模式" hint="切换深色 / 浅色">
            <button
              type="button"
              onClick={() => setDarkMode(!isDarkMode)}
              className="topbar-action border border-border"
              aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
              <span>{isDarkMode ? '深色 · 开' : '浅色 · 关'}</span>
            </button>
          </Row>
          <div className="flex flex-col gap-xs">
            <span className="text-[13px] text-ink">主题色</span>
            <div className="flex flex-wrap gap-xs">
              {themeColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setThemeColor(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    themeColor === color
                      ? 'border-primary shadow-[0_0_0_2px_var(--color-primary-soft)]'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`选择主题色 ${color}`}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] text-ink-subtle">
              主题色决定主操作、链接与选中态。
            </p>
          </div>
        </Section>

        <Section title="数据 / Data">
          <div className="flex flex-wrap gap-xs">
            <AppButton variant="secondary" onClick={() => void handleExport('json')}>
              <Download className="h-4 w-4" />
              导出 JSON
            </AppButton>
            <AppButton variant="secondary" onClick={() => void handleExport('csv')}>
              <Download className="h-4 w-4" />
              导出 CSV
            </AppButton>
            <AppButton
              variant="secondary"
              onClick={() => void handleExport('markdown')}
            >
              <Download className="h-4 w-4" />
              导出 Markdown
            </AppButton>
            <AppButton variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              导入 JSON
            </AppButton>
          </div>
          {exportStatus ? (
            <p className="font-mono text-[12px] text-ink-muted">{exportStatus}</p>
          ) : null}
        </Section>

        <Section title="通知 / Notifications">
          <Row
            label="开启提醒"
            hint={
              notificationPermission === 'granted'
                ? '已授权'
                : notificationPermission === 'denied'
                  ? '已拒绝'
                  : '未申请'
            }
          >
            <div className="flex items-center gap-sm">
              <AppSegmentedControl
                value={enableNotifications ? 'on' : 'off'}
                options={[
                  { value: 'on', label: '开' },
                  { value: 'off', label: '关' },
                ]}
                onChange={(value) =>
                  void handleNotificationChange(value === 'on')
                }
              />
              {notificationPermission === 'granted' ? (
                <Bell className="h-4 w-4 text-success" aria-hidden />
              ) : (
                <BellOff className="h-4 w-4 text-ink-subtle" aria-hidden />
              )}
            </div>
          </Row>
          <Row label="截止前提醒（小时）">
            <input
              type="number"
              min={1}
              max={24}
              value={reminderHours}
              onChange={(e) => setReminderHours(Number(e.target.value))}
              className="h-9 w-20 rounded-md border border-border bg-surface px-2 text-center text-body text-ink"
            />
          </Row>
        </Section>

        <Section title="账号 / Account" muted>
          <p className="text-[12px] text-ink-muted">
            登录与同步系统接入后将出现在这里。当前为纯本地模式，所有数据保存在本机 IndexedDB。
          </p>
        </Section>

        <Section title="工作空间 / Workspace" muted>
          <p className="text-[12px] text-ink-muted">
            多工作空间 / 团队成员 / 权限将在登录系统上线后开放。
          </p>
        </Section>

        <Section title="关于 / About">
          <p className="text-body text-ink">CommitToDo Web v0.1.0</p>
          <p className="font-mono text-[12px] text-ink-subtle">
            任务管理，像 Git 一样优雅。
          </p>
        </Section>
      </div>

      <AppDialog open={importOpen} onOpenChange={setImportOpen}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>导入数据</AppDialogTitle>
            <AppDialogDescription>
              选择 Commit 导出的 JSON 文件。合并模式会保留现有数据并覆盖冲突项；覆盖模式会清空当前数据。
            </AppDialogDescription>
          </AppDialogHeader>
          <div className="flex flex-col gap-md">
            <AppSegmentedControl
              value={importMode}
              options={[
                { value: 'merge', label: '合并' },
                { value: 'overwrite', label: '覆盖' },
              ]}
              onChange={(value) => setImportMode(value as 'merge' | 'overwrite')}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handleFileSelect(e)}
              className="block w-full rounded-md border border-border bg-surface px-2 py-2 text-body text-ink file:mr-4 file:rounded-md file:bg-canvas-elevated file:px-2 file:py-1 file:text-body-sm file:text-ink"
            />
            {importStatus ? (
              <p className="font-mono text-[12px] text-ink-muted">{importStatus}</p>
            ) : null}
          </div>
          <AppDialogFooter>
            <AppButton variant="secondary" onClick={() => setImportOpen(false)}>
              关闭
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}

interface SectionProps {
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}

function Section({ title, muted = false, children }: SectionProps): JSX.Element {
  return (
    <section className="setting-section">
      <header className="setting-section-header">
        <h2 className={`setting-section-title ${muted ? 'opacity-70' : ''}`}>
          {title}
        </h2>
      </header>
      <div className="setting-section-body">{children}</div>
    </section>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Row({ label, hint, children }: RowProps): JSX.Element {
  return (
    <div className="setting-row">
      <div className="flex flex-col gap-xxs">
        <span className="setting-row-label">{label}</span>
        {hint ? <span className="setting-row-help">{hint}</span> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
