import { SvgIcon, type SvgIconProps } from '@/ui/icons';

/** 外观：主题与树密度。 */
export function SunIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3m0 14v3m10-10h-3M5 12H2m17-7-2 2M7 17l-2 2m14 0-2-2M7 7 5 5" />
    </SvgIcon>
  );
}

/** 注解：分支、合并与停滞说明。 */
export function HelpIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9a2.6 2.6 0 1 1 3.4 2.5l-.8.5v1.6m0 3.4h.01" />
    </SvgIcon>
  );
}

/** 关于：应用信息与隐私。 */
export function TuneIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 8h6m4 0h6M4 16h10m4 0h2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="16" cy="16" r="2" />
    </SvgIcon>
  );
}

/** 数据与备份：本机备份状态。 */
export function BackupIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 16h14a2 2 0 0 1 2 2v2H3v-2a2 2 0 0 1 2-2Z" />
      <path d="M12 4v9m-4-4 4 4 4-4" />
    </SvgIcon>
  );
}
