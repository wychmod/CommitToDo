import { Check } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { V3Button } from '@/presentation/components/v3';
import {
  Density,
  ThemeMode,
  useSettingsStore,
} from '@/presentation/stores/settings-store';
import {
  SettingsSegmentedControl,
  SettingsSegmentedOption,
} from './settings-segmented-control';

export interface AppearanceSectionProps {
  onSaved?: () => void;
}

const themeModeOptions: SettingsSegmentedOption<ThemeMode>[] = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' },
];

const densityOptions: SettingsSegmentedOption<Density>[] = [
  { value: 'comfortable', label: '舒适' },
  { value: 'compact', label: '紧凑' },
];

const accentColors = [
  { name: '绿', value: '#80e48c' },
  { name: '青', value: '#59cbd0' },
  { name: '蓝', value: '#6e95ff' },
  { name: '黄', value: '#e3c44a' },
  { name: '红', value: '#e6635b' },
];

export function AppearanceSection({ onSaved }: AppearanceSectionProps): JSX.Element {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const setThemeColor = useSettingsStore((s) => s.setThemeColor);
  const density = useSettingsStore((s) => s.density);
  const setDensity = useSettingsStore((s) => s.setDensity);

  const handleThemeModeChange = (value: ThemeMode): void => {
    setThemeMode(value);
    onSaved?.();
  };

  const handleDensityChange = (value: Density): void => {
    setDensity(value);
    onSaved?.();
  };

  const handleColorChange = (color: string): void => {
    setThemeColor(color);
    onSaved?.();
  };

  return (
    <section
      id="appearance"
      className="scroll-mt-[92px]"
      aria-labelledby="appearance-heading"
    >
      <h2
        id="appearance-heading"
        className="text-[20px] font-semibold text-[var(--v3-text-strong)]"
      >
        外观
      </h2>

      <div className="mt-6 flex flex-col gap-6">
        <SettingsRow label="主题模式">
          <SettingsSegmentedControl
            ariaLabel="主题模式"
            options={themeModeOptions}
            value={themeMode}
            onChange={handleThemeModeChange}
          />
        </SettingsRow>

        <SettingsRow label="强调色">
          <div className="flex items-center gap-[18px]">
            {accentColors.map((color) => {
              const selected = themeColor === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  aria-label={`选择${color.name}色强调色`}
                  aria-pressed={selected}
                  className={cn(
                    'h-8 w-8 rounded-full transition-[transform,box-shadow] duration-[var(--v3-fast)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] hover:scale-105',
                    selected && '[box-shadow:0_0_0_2px_#000,0_0_0_4px_var(--v3-primary)]'
                  )}
                  style={{ backgroundColor: color.value }}
                >
                  {selected ? (
                    <Check
                      size={14}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="mx-auto text-[var(--v3-text-on-primary)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </SettingsRow>

        <SettingsRow label="界面密度">
          <SettingsSegmentedControl
            ariaLabel="界面密度"
            options={densityOptions}
            value={density}
            onChange={handleDensityChange}
          />
        </SettingsRow>

        <SettingsRow label="界面预览">
          <div
            className={cn(
              'flex w-full items-center gap-4 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-4',
              density === 'compact' ? 'h-[46px]' : 'h-[54px]'
            )}
            data-testid="appearance-preview"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-[var(--v3-radius-sm)]"
              style={{ backgroundColor: themeColor }}
            >
              <Check
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                className="text-[var(--v3-text-on-primary)]"
              />
            </div>
            <span className="text-[14px] text-[var(--v3-text-secondary)]">
              复选框选中状态
            </span>
            <div className="flex-1" />
            <V3Button
              style={{ backgroundColor: themeColor, borderColor: themeColor }}
              className="pointer-events-none"
            >
              主按钮
            </V3Button>
            <div className="flex flex-col gap-1">
              {['main', 'launch', 'design'].map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: themeColor }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] text-[var(--v3-text-muted)]">
                    {name} 分支
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SettingsRow>
      </div>
    </section>
  );
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
