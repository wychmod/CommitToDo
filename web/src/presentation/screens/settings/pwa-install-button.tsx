import { Download, Check } from 'lucide-react';

import { V3Button } from '@/presentation/components/v3';
import { PwaStatus } from './settings-screen-store';

export interface PwaInstallButtonProps {
  status: PwaStatus;
  onInstall: () => Promise<void>;
}

export function PwaInstallButton({
  status,
  onInstall,
}: PwaInstallButtonProps): JSX.Element {
  const label =
    status === 'installable'
      ? '安装 CommitToDo'
      : status === 'installed'
        ? '已安装'
        : '当前浏览器不支持安装';

  return (
    <V3Button
      className="w-full"
      disabled={status !== 'installable'}
      onClick={() => void onInstall()}
    >
      {status === 'installed' ? (
        <Check size={16} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Download size={16} strokeWidth={1.5} aria-hidden="true" />
      )}
      {label}
    </V3Button>
  );
}
