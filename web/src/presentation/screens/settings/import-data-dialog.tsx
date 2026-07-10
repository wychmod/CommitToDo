import * as React from 'react';
import { useRef } from 'react';

import { V3Button } from '@/presentation/components/v3';
import { ImportMode } from '@/application/usecases/import-data-usecase';
import { useSettingsScreenStore } from './settings-screen-store';
import { SettingsDialog } from './settings-dialog';
import {
  SettingsSegmentedControl,
  SettingsSegmentedOption,
} from './settings-segmented-control';

export interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const importModeOptions: SettingsSegmentedOption<ImportMode>[] = [
  { value: 'merge', label: '合并，保留现有数据' },
  { value: 'overwrite', label: '覆盖，先备份再导入' },
];

export function ImportDataDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportDataDialogProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileName = useSettingsScreenStore((s) => s.importFileName);
  const importPreview = useSettingsScreenStore((s) => s.importPreview);
  const importError = useSettingsScreenStore((s) => s.importError);
  const importExecuting = useSettingsScreenStore((s) => s.importExecuting);
  const previewImportFile = useSettingsScreenStore((s) => s.previewImportFile);
  const executeImport = useSettingsScreenStore((s) => s.executeImport);
  const closeImportDialog = useSettingsScreenStore((s) => s.closeImportDialog);

  const [mode, setMode] = React.useState<ImportMode>('merge');

  React.useEffect(() => {
    if (open) {
      setMode('merge');
    }
  }, [open]);

  const handleClose = (): void => {
    closeImportDialog();
    onOpenChange(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    await previewImportFile(file);
  };

  const handleImport = async (): Promise<void> => {
    const result = await executeImport(mode);
    if (result) {
      onSuccess?.();
      handleClose();
    }
  };

  return (
    <SettingsDialog
      open={open}
      onOpenChange={handleClose}
      title="导入数据"
      description="选择 Commit 导出的 JSON 文件。合并模式会保留现有数据并覆盖冲突项；覆盖模式会先清空当前数据再导入。"
      footer={
        <>
          <V3Button variant="ghost" onClick={handleClose}>
            取消
          </V3Button>
          <V3Button
            disabled={!importPreview || importExecuting}
            onClick={() => void handleImport()}
          >
            {importExecuting ? '导入中…' : '导入'}
          </V3Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <SettingsSegmentedControl
          ariaLabel="导入冲突策略"
          options={importModeOptions}
          value={mode}
          onChange={(value) => setMode(value)}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void handleFileChange(e)}
          className="block w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 py-2 text-[14px] text-[var(--v3-text)] file:mr-4 file:rounded-[var(--v3-radius-sm)] file:border-0 file:bg-[var(--v3-control)] file:px-3 file:py-1 file:text-[13px] file:text-[var(--v3-text-strong)]"
        />

        {importFileName && importPreview ? (
          <div className="rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-4">
            <p className="text-[14px] font-medium text-[var(--v3-text-strong)]">
              {importFileName}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <PreviewCount label="仓库" value={importPreview.repositories} />
              <PreviewCount label="分支" value={importPreview.branches} />
              <PreviewCount label="任务" value={importPreview.tasks} />
              <PreviewCount label="提交" value={importPreview.commits} />
            </div>
          </div>
        ) : null}

        {importError ? (
          <p className="text-[14px] text-[var(--v3-danger)]">{importError}</p>
        ) : null}
      </div>
    </SettingsDialog>
  );
}

interface PreviewCountProps {
  label: string;
  value: number;
}

function PreviewCount({ label, value }: PreviewCountProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-[var(--v3-radius-sm)] bg-[var(--v3-card)] px-3 py-2">
      <span className="text-[13px] text-[var(--v3-text-secondary)]">{label}</span>
      <span className="text-[14px] font-semibold text-[var(--v3-text-strong)]">
        {value}
      </span>
    </div>
  );
}
