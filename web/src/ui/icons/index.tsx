import { SvgIcon, type SvgIconProps } from './svg-icon';

/** 图标骨架示例：每个图标一个组件，路径内联，不复用外部 sprite。 */
export function CheckIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m5 12 4 4L19 6" />
    </SvgIcon>
  );
}

/** 注解入口：折叠后用一个小图标提示「这里还有一句解释」。 */
export function InfoIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </SvgIcon>
  );
}

/** 二级页返回。 */
export function ArrowLeftIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </SvgIcon>
  );
}

/** 树节点展开控件：展开时朝下，折叠时朝右。 */
export function ChevronDownIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  );
}

export function ChevronRightIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </SvgIcon>
  );
}

/** 行尾「更多」操作。 */
export function MoreIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </SvgIcon>
  );
}

/** 分支置顶标记。 */
export function PinIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9 4h6l-1 5 3 3H7l3-3-1-5Z" />
      <path d="M12 12v7" />
    </SvgIcon>
  );
}

/** 前进入口：认证页的「打开本机工作区」与表单跳转。 */
export function ArrowIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </SvgIcon>
  );
}

/** 本机工作区入口。 */
export function DeviceIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M12 17v3" />
      <path d="M9 20h6" />
    </SvgIcon>
  );
}

/** 分支与时间树示意。 */
export function BranchIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="7" cy="5" r="2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="6" r="2" />
      <path d="M7 7v10" />
      <path d="M17 8c0 4-1 5-5 5H7" />
    </SvgIcon>
  );
}

/** 新建。 */
export function PlusIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </SvgIcon>
  );
}

/** 扁平列表视图。 */
export function ListIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </SvgIcon>
  );
}

/** 账号状态。 */
export function UserIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.7 3.4-5.5 7-5.5s6.2 1.8 7 5.5" />
    </SvgIcon>
  );
}

/** 找回密码「已发送」步骤的邮件提示。 */
export function MailIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </SvgIcon>
  );
}

/** 密码显示切换。 */
export function EyeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </SvgIcon>
  );
}

export function EyeOffIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 5l16 14" />
      <path d="M10 6.5A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.8" />
      <path d="M6.4 8.2A17 17 0 0 0 2 12s3.6 6 10 6a9.9 9.9 0 0 0 4-.8" />
    </SvgIcon>
  );
}

export { SvgIcon };
export type { IconSize, SvgIconProps } from './svg-icon';
