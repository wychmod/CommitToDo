import * as React from 'react';
import { FileJson, FileSpreadsheet, FileText, Upload } from 'lucide-react';

import { V3Button } from '@/presentation/components/v3';
import { useSettingsStore } from '@/presentation/stores/settings-store';
import { ExportFormat } from '@/domain/services/data-export-service';
import {
  StorageStatus,
  formatBytes,
  formatLastSaved,
} from './settings-screen-store';
import { SettingsSwitch } from './settings-switch';
import { ImportDataDialog } from './import-data-dialog';

export interface DataSectionProps {
  storageStatus: StorageStatus;
  storageSizeBytes: number | null;
  lastSavedAt: Date | null;
  onExport: (format: ExportFormat) => Promise<void>;
  onImportSuccess?: () => void;
}

export function DataSection({
  storageStatus,
  storageSizeBytes,
  lastSavedAt,
  onExport,
  onImportSuccess,
}: DataSectionProps): JSX.Element {
  const enableAutoBackup = useSettingsStore((s) => s.enableAutoBackup);
  const setAutoBackup = useSettingsStore((s) => s.setAutoBackup);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat): Promise<void> => {
    setExporting(format);
    try {
      await onExport(format);
    } finally {
      setExporting(null);
    }
  };

  const storageLabel =
    storageStatus === 'unavailable'
      ? '本地数据不可用'
      : `IndexedDB · ${formatBytes(storageSizeBytes)} · ${formatLastSaved(lastSavedAt)}`;

  return (
    <section
      id="data"
      className="scroll-mt-[92px]"
      aria-labelledby="data-heading"
    >
      <h2
        id="data-heading"
        className="text-[20px] font-semibold text-[var(--v3-text-strong)]"
      >
        数据与备份
      </h2>

      <div className="mt-6 flex flex-col gap-5">
        <SettingsRow label="本地数据状态">
          <span
            className="text-[14px]"
            style={{
              color:
                storageStatus === 'saved'
                  ? 'var(--v3-success)'
                  : storageStatus === 'saving'
                    ? 'var(--v3-warning)'
                    : storageStatus === 'error' || storageStatus === 'unavailable'
                      ? 'var(--v3-danger)'
                      : 'var(--v3-text-secondary)',
            }}
          >
            {storageLabel}
          </span>
        </SettingsRow>

        <SettingsRow label="数据操作">
          <div className="flex flex-wrap gap-3">
            <ExportButton
              format="json"
              label="导出 JSON"
              icon={<FileJson size={16} strokeWidth={1.5} aria-hidden="true" />}
              exporting={exporting}
              onExport={handleExport}
            />
            <ExportButton
              format="csv"
              label="导出 CSV"
              icon={<FileSpreadsheet size={16} strokeWidth={1.5} aria-hidden="true" />}
              exporting={exporting}
              onExport={handleExport}
            />
            <ExportButton
              format="markdown"
              label="导出 Markdown"
              icon={<FileText size={16} strokeWidth={1.5} aria-hidden="true" />}
              exporting={exporting}
              onExport={handleExport}
            />
            <V3Button
              variant="secondary"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={16} strokeWidth={1.5} aria-hidden="true" />
              导入数据
            </V3Button>
          </div>
        </SettingsRow>

        <SettingsRow label="自动备份">
          <div className="flex flex-1 items-center justify-between gap-4">
            <span className="text-[14px] text-[var(--v3-text-secondary)]">
              仅保存在当前设备
            </span>
            <SettingsSwitch
              checked={enableAutoBackup}
              onCheckedChange={setAutoBackup}
              disabled
              ariaLabel="自动备份"
            />
          </div>
        </SettingsRow>
      </div>

      <ImportDataDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={onImportSuccess}
      />
    </section>
  );
}

interface ExportButtonProps {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  exporting: ExportFormat | null;
  onExport: (format: ExportFormat) => Promise<void>;
}

function ExportButton({
  format,
  label,
  icon,
  exporting,
  onExport,
}: ExportButtonProps): JSX.Element {
  return (
    <V3Button
      variant="secondary"
      size="sm"
      disabled={exporting === format}
      onClick={() => void onExport(format)}
    >
      {icon}
      {label}
    </V3Button>
  );
}

interface SettingsRowProps {
  label: string;
  children: React.ReactNode;
}

function SettingsRow({ label, children }: SettingsRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start">
      <span className="w-[118px] shrink-0 pt-0.5 text-[14px] text-[var(--v3-text)]">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
