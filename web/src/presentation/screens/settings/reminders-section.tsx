import * as React from 'react';

import { V3Button } from '@/presentation/components/v3';
import { useSettingsStore } from '@/presentation/stores/settings-store';
import { SettingsSelect } from './settings-select';
import { SettingsSwitch } from './settings-switch';

export interface RemindersSectionProps {
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  onSaved?: () => void;
}

const leadTimeOptions = [
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 1440, label: '1 天' },
];

export function RemindersSection({
  notificationPermission,
  onRequestPermission,
  onSaved,
}: RemindersSectionProps): JSX.Element {
  const enableNotifications = useSettingsStore((s) => s.enableNotifications);
  const setNotifications = useSettingsStore((s) => s.setNotifications);
  const defaultLeadMinutes = useSettingsStore((s) => s.defaultLeadMinutes);
  const setDefaultLeadMinutes = useSettingsStore((s) => s.setDefaultLeadMinutes);

  const handleSwitchChange = async (checked: boolean): Promise<void> => {
    if (checked) {
      const permission = await onRequestPermission();
      if (permission === 'granted') {
        setNotifications(true);
        onSaved?.();
      }
    } else {
      setNotifications(false);
      onSaved?.();
    }
  };

  const handleLeadTimeChange = (minutes: number): void => {
    setDefaultLeadMinutes(minutes);
    onSaved?.();
  };

  const permissionLabel = getPermissionLabel(notificationPermission);

  return (
    <section
      id="reminders"
      className="scroll-mt-[92px]"
      aria-labelledby="reminders-heading"
    >
      <h2
        id="reminders-heading"
        className="text-[20px] font-semibold text-[var(--v3-text-strong)]"
      >
        提醒
      </h2>

      <div className="mt-6 flex flex-col gap-5">
        <SettingsRow label="截止提醒">
          <SettingsSwitch
            checked={enableNotifications}
            onCheckedChange={(checked) => void handleSwitchChange(checked)}
            ariaLabel="截止提醒"
          />
        </SettingsRow>

        <SettingsRow label="默认提前时间">
          <SettingsSelect
            ariaLabel="默认提前时间"
            value={defaultLeadMinutes}
            options={leadTimeOptions}
            onChange={handleLeadTimeChange}
            disabled={!enableNotifications}
          />
        </SettingsRow>

        <SettingsRow label="通知权限">
          <div className="flex items-center gap-3">
            <span
              className="text-[14px]"
              style={{
                color:
                  notificationPermission === 'granted'
                    ? 'var(--v3-success)'
                    : notificationPermission === 'denied'
                      ? 'var(--v3-danger)'
                      : 'var(--v3-text-secondary)',
              }}
            >
              {permissionLabel}
            </span>
            {notificationPermission === 'default' ? (
              <V3Button
                size="sm"
                variant="secondary"
                onClick={() => void onRequestPermission()}
              >
                请求权限
              </V3Button>
            ) : null}
          </div>
        </SettingsRow>
      </div>
    </section>
  );
}

function getPermissionLabel(
  permission: NotificationPermission | 'unsupported'
): string {
  switch (permission) {
    case 'granted':
      return '已允许';
    case 'denied':
      return '已拒绝';
    case 'default':
      return '未授权';
    case 'unsupported':
      return '不支持';
    default:
      return '未知';
  }
}

interface SettingsRowProps {
  label: string;
  children: React.ReactNode;
}

function SettingsRow({ label, children }: SettingsRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
      <span className="w-[118px] shrink-0 text-[14px] text-[var(--v3-text)]">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
