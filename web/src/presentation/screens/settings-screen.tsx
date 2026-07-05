import { Moon, Sun, Download, Upload, Bell, BellOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { AppButton } from '../components/common/app-button';
import { AppDialog, AppDialogContent, AppDialogFooter, AppDialogHeader, AppDialogTitle, AppDialogDescription } from '../components/common/app-dialog';
import { AppSegmentedControl } from '../components/common/app-segmented-control';
import { container } from '../../core/di/injection-container';
import { DataExportService } from '../../domain/services/data-export-service';
import { WebFileSaveService } from '../../platform/web-file-save-service';
import { WebNotificationService } from '../../platform/web-notification-service';
import { ImportDataUseCase } from '../../application/usecases/import-data-usecase';
import { useHomeStore } from '../stores/home-store';

const themeColors = [
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const service = container.resolve(WebNotificationService);
    setNotificationPermission(service.getPermission());
  }, [enableNotifications]);

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
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
          format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown',
      });
      setExportStatus('导出成功');
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : '导出失败');
    }
  };

  const handleNotificationChange = async (value: boolean) => {
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      reloadHome();
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : '导入失败');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-md">
      <h1 className="text-display-md font-semibold text-ink">设置</h1>

      <section className="rounded-lg border border-hairline bg-surface-1 p-md">
        <h2 className="mb-md text-headline font-semibold text-ink">外观</h2>
        <div className="flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <span className="text-body text-ink">深色模式</span>
            <button
              type="button"
              onClick={() => setDarkMode(!isDarkMode)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-ink hover:bg-surface-3"
              aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-body text-ink">主题色</span>
            <div className="flex flex-wrap gap-xs">
              {themeColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setThemeColor(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    themeColor === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`选择主题色 ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hairline bg-surface-1 p-md">
        <h2 className="mb-md text-headline font-semibold text-ink">通知</h2>
        <div className="flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <span className="text-body text-ink">开启提醒</span>
            <AppSegmentedControl
              value={enableNotifications ? 'on' : 'off'}
              options={[
                { value: 'on', label: '开' },
                { value: 'off', label: '关' },
              ]}
              onChange={(value) => handleNotificationChange(value === 'on')}
            />
          </div>
          <div className="flex items-center gap-xs text-body-sm text-ink-muted">
            {notificationPermission === 'granted' ? (
              <Bell className="h-4 w-4 text-success" />
            ) : (
              <BellOff className="h-4 w-4 text-ink-subtle" />
            )}
            <span>
              权限状态: {notificationPermission === 'granted' ? '已授权' : notificationPermission === 'denied' ? '已拒绝' : '未申请'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body text-ink">截止前提醒（小时）</span>
            <input
              type="number"
              min={1}
              max={24}
              value={reminderHours}
              onChange={(e) => setReminderHours(Number(e.target.value))}
              className="h-10 w-20 rounded-md border border-hairline-strong bg-surface-1 px-xs text-center text-body text-ink"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hairline bg-surface-1 p-md">
        <h2 className="mb-md text-headline font-semibold text-ink">数据管理</h2>
        <div className="flex flex-wrap gap-xs">
          <AppButton variant="secondary" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4" />
            导出 JSON
          </AppButton>
          <AppButton variant="secondary" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" />
            导出 CSV
          </AppButton>
          <AppButton variant="secondary" onClick={() => handleExport('markdown')}>
            <Download className="h-4 w-4" />
            导出 Markdown
          </AppButton>
          <AppButton variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            导入 JSON
          </AppButton>
        </div>
        {exportStatus ? <p className="mt-sm text-body-sm text-ink-muted">{exportStatus}</p> : null}
      </section>

      <section className="rounded-lg border border-hairline bg-surface-1 p-md">
        <h2 className="mb-md text-headline font-semibold text-ink">关于</h2>
        <p className="text-body text-ink-muted">Commit Web v0.1.0</p>
        <p className="text-body-sm text-ink-subtle">任务管理，像 Git 一样优雅。</p>
      </section>

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
              onChange={handleFileSelect}
              className="block w-full rounded-md border border-hairline-strong bg-surface-1 px-xs py-2 text-body text-ink file:mr-4 file:rounded-md file:bg-surface-2 file:px-xs file:py-1 file:text-body-sm file:text-ink"
            />
            {importStatus ? <p className="text-body-sm text-ink-muted">{importStatus}</p> : null}
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
