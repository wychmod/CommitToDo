import { ShieldCheck } from 'lucide-react';

/**
 * Local-first trust note pinned at the bottom of the auth dialog.
 *
 * Reassures the visitor that the demo login never uploads anything and that
 * business data stays on-device. The `.auth-trust` class (see auth-modal.css)
 * supplies the divider and padding; this component supplies the content.
 */
export function AuthTrustNote(): JSX.Element {
  return (
    <div className="auth-trust flex items-center gap-2 text-[12px] text-[var(--v3-text-secondary)]">
      <ShieldCheck
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className="shrink-0 text-[var(--v3-primary)]"
      />
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v3-primary)]"
        aria-hidden="true"
      />
      <span>本地优先 · 数据保存在本机，模拟登录不会上传任何信息</span>
    </div>
  );
}
