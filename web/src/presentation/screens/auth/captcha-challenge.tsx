import { ShieldAlert } from 'lucide-react';
import * as React from 'react';

export interface CaptchaChallengeProps {
  onVerified(token: string): void;
  onExpired(): void;
}

/**
 * CAPTCHA challenge placeholder.
 *
 * In production, this would integrate with Tencent Cloud CAPTCHA or
 * CloudBase's built-in CAPTCHA. For now, it shows a notice that
 * CAPTCHA verification is required.
 */
export function CaptchaChallenge({
  onVerified,
  onExpired,
}: CaptchaChallengeProps): JSX.Element {
  const [verifying, setVerifying] = React.useState(false);

  const handleVerify = (): void => {
    setVerifying(true);
    // Simulate CAPTCHA verification - in production this would open
    // the actual CAPTCHA widget and call onVerified with the token
    setTimeout(() => {
      setVerifying(false);
      // Generate a mock token - real implementation would get this from CAPTCHA service
      onVerified(`captcha:${Date.now()}`);
    }, 500);
  };

  void onExpired;

  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--v3-radius-md)] border border-[var(--v3-warning)] bg-[var(--v3-warning-soft,#fff8e6)] px-4 py-4">
      <ShieldAlert size={24} strokeWidth={1.5} className="text-[var(--v3-warning)]" aria-hidden="true" />
      <p className="text-center text-[13px] text-[var(--v3-text-secondary)]">
        为保护账户安全，请完成人机验证
      </p>
      <button
        type="button"
        onClick={handleVerify}
        disabled={verifying}
        className="flex h-10 items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[var(--v3-primary)] px-4 text-[13px] font-medium text-[var(--v3-text-on-primary)] transition-opacity disabled:opacity-50"
      >
        {verifying ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>验证中…</span>
          </>
        ) : (
          <span>开始验证</span>
        )}
      </button>
    </div>
  );
}
