import '@/core/theme/v3-tokens.css';
import './auth-modal.css';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { useAuthStore } from '@/presentation/stores/auth-store';
import { AuthBrandHeader } from './auth-brand-header';
import { AuthBranchVisual } from './auth-branch-visual';
import { AuthTabs } from './auth-tabs';
import { AuthTrustNote } from './auth-trust-note';
import { ForgotPasswordView } from './forgot-password-view';
import { LoginForm } from './login-form';
import { OtpVerificationView } from './otp-verification-view';
import { SignupForm } from './signup-form';
import { PhoneLoginForm } from './phone-login-form';
import { PhoneSignupForm } from './phone-signup-form';
import type { AuthView, AuthMethod } from './auth-types';
import { sanitizeReturnTo } from '@/core/auth/auth-return-to';
import { readCloudBaseAuthFeatures } from '@/core/cloudbase/cloudbase-config';

export interface AuthDialogProps {
  open: boolean;
  routeMode: 'login' | 'signup';
  returnTo?: string;
  onOpenChange(open: boolean): void;
  onNavigateLogin(): void;
  onNavigateSignup(): void;
  onAuthenticated(): void;
}

const VIEW_COPY: Record<
  AuthView,
  { title: string; description: string }
> = {
  login: {
    title: '欢迎回来',
    description: '继续推进目标，把今天的进展提交掉。',
  },
  signup: {
    title: '创建你的工作区',
    description: '几秒即可开始，数据始终保存在本机。',
  },
  'forgot-password': {
    title: '重置密码',
    description: '通过邮箱验证码设置新密码。',
  },
  'verify-otp': {
    title: '验证邮箱',
    description: '输入邮箱中的验证码以完成注册。',
  },
};

const METHOD_LABELS: Record<AuthMethod, string> = {
  email: '邮箱',
  phone: '手机号',
};

const REGISTRATION_NOTICE = '注册成功，请输入验证码完成验证。';

export function AuthDialog({
  open,
  routeMode,
  returnTo,
  onOpenChange,
  onNavigateLogin,
  onNavigateSignup,
  onAuthenticated,
}: AuthDialogProps): JSX.Element {
  const authFeatures = readCloudBaseAuthFeatures();
  const operation = useAuthStore((s) => s.operation);
  const error = useAuthStore((s) => s.error);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const verifyEmailOtp = useAuthStore((s) => s.verifyEmailOtp);
  const startPhoneAuth = useAuthStore((s) => s.startPhoneAuth);
  const verifyPhoneOtp = useAuthStore((s) => s.verifyPhoneOtp);
  const startGithubAuth = useAuthStore((s) => s.startGithubAuth);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset);
  const clearError = useAuthStore((s) => s.clearError);

  const [forgotActive, setForgotActive] = React.useState(false);
  const [verifyOtpActive, setVerifyOtpActive] = React.useState(false);
  const [emailPreset, setEmailPreset] = React.useState<string | undefined>(undefined);
  const [pendingEmail, setPendingEmail] = React.useState<string>('');
  const [pendingPassword, setPendingPassword] = React.useState<string>('');
  const [pendingVerificationId, setPendingVerificationId] = React.useState<string>('');
  const [notice, setNotice] = React.useState<string | undefined>(undefined);
  const [authMethod, setAuthMethod] = React.useState<AuthMethod>('email');

  const bodyRef = React.useRef<HTMLDivElement>(null);

  const view: AuthView = forgotActive
    ? 'forgot-password'
    : verifyOtpActive
      ? 'verify-otp'
      : routeMode;
  const isBusy = operation !== null;
  const copy = VIEW_COPY[view];

  React.useEffect(() => {
    if (open) {
      setForgotActive(false);
      setVerifyOtpActive(false);
      setEmailPreset(undefined);
      setPendingEmail('');
      setPendingPassword('');
      setPendingVerificationId('');
      setNotice(undefined);
      setAuthMethod('email');
      clearError();
    }
  }, [open, clearError]);

  const goToLogin = (): void => {
    setForgotActive(false);
    setVerifyOtpActive(false);
    setEmailPreset(undefined);
    setNotice(undefined);
    setAuthMethod('email');
    clearError();
    onNavigateLogin();
  };

  const goToSignup = (): void => {
    setForgotActive(false);
    setVerifyOtpActive(false);
    setEmailPreset(undefined);
    setNotice(undefined);
    setAuthMethod('email');
    clearError();
    onNavigateSignup();
  };

  const handleTabChange = (next: 'login' | 'signup'): void => {
    if (next === 'login') goToLogin();
    else goToSignup();
  };

  const handleForgotPassword = (): void => {
    setNotice(undefined);
    setEmailPreset(undefined);
    setForgotActive(true);
  };

  const handleForgotBack = (): void => {
    setForgotActive(false);
  };

  const handleSignupCompleted = (email: string): void => {
    setPendingEmail(email);
    setNotice(REGISTRATION_NOTICE);
    setVerifyOtpActive(true);
  };

  const handleVerifyOtp = async (code: string): Promise<boolean> => {
    const ok = await verifyEmailOtp(pendingVerificationId, code);
    if (ok) onAuthenticated();
    return ok;
  };

  const handleResendOtp = async (email: string): Promise<void> => {
    if (!pendingPassword) return;
    const result = await signUpWithEmail(email, pendingPassword);
    if (result) setPendingVerificationId(result.verificationId);
  };

  const handleSignupSubmit = async (values: {
    email: string;
    password: string;
  }): Promise<{ verificationId: string } | null> => {
    setPendingPassword(values.password);
    const result = await signUpWithEmail(values.email, values.password);
    if (result) setPendingVerificationId(result.verificationId);
    return result;
  };

  const handleGithub = async (): Promise<void> => {
    const safeReturnTo = sanitizeReturnTo(returnTo);
    const intent = routeMode === 'signup' ? 'signup' : 'login';
    await startGithubAuth(intent, safeReturnTo);
  };

  const handlePhoneSendCode = async (phone: string, shouldCreateUser: boolean): Promise<{ verificationId: string; retryAfterSeconds: number } | null> => {
    return startPhoneAuth(phone, shouldCreateUser);
  };

  const handlePhoneVerify = async (verificationId: string, code: string): Promise<boolean> => {
    const ok = await verifyPhoneOtp(verificationId, code);
    if (ok) onAuthenticated();
    return ok;
  };

  const handleRecover = async (email: string): Promise<boolean> => {
    return requestPasswordReset(email);
  };

  const handleCompleteRecovery = async (
    email: string,
    code: string,
    password: string
  ): Promise<boolean> => {
    const ok = await completePasswordReset(email, code, password);
    if (ok) onAuthenticated();
    return ok;
  };

  const handleOpenAutoFocus = (e: Event): void => {
    e.preventDefault();
    const body = bodyRef.current;
    if (!body) return;
    const firstInput = body.querySelector<HTMLInputElement>('input');
    if (firstInput) {
      firstInput.focus();
      return;
    }
    body.querySelector<HTMLButtonElement>('button')?.focus();
  };

  const handleCloseAutoFocus = (e: Event): void => {
    e.preventDefault();
    document.getElementById('landing-login-trigger')?.focus();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="auth-overlay">
          <DialogPrimitive.Content
            className="auth-content"
            onOpenAutoFocus={handleOpenAutoFocus}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <DialogPrimitive.Close
              className="auth-close"
              aria-label="关闭登录与注册"
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </DialogPrimitive.Close>

            <div className="auth-header">
              <AuthBrandHeader />
            </div>

            <div className="auth-body" ref={bodyRef}>
              <AuthBranchVisual />

              <DialogPrimitive.Title
                className="mt-4 text-[28px] font-bold leading-tight text-[var(--v3-text-strong)]"
              >
                {copy.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className="mt-1.5 text-[14px] text-[var(--v3-text-secondary)]"
              >
                {copy.description}
              </DialogPrimitive.Description>

              {view === 'login' || view === 'signup' ? (
                <div className="mt-5 space-y-4">
                  <AuthTabs
                    value={view}
                    onChange={handleTabChange}
                    disabled={isBusy}
                  />
                  {/* Auth method switcher: email / phone */}
                  <div className="flex rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] p-1">
                    {(['email', ...(authFeatures.phone ? ['phone'] : [])] as AuthMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setAuthMethod(method);
                          clearError();
                        }}
                        disabled={isBusy}
                        className={`flex-1 rounded-[var(--v3-radius-sm)] py-2 text-[13px] font-medium transition-colors ${
                          authMethod === method
                            ? 'bg-[var(--v3-primary)] text-[var(--v3-text-on-primary)]'
                            : 'text-[var(--v3-text-secondary)] hover:text-[var(--v3-text-strong)]'
                        } disabled:opacity-50`}
                      >
                        {METHOD_LABELS[method]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                {view === 'login' && authMethod === 'email' ? (
                  <LoginForm
                    emailPreset={emailPreset}
                    operation={operation}
                    authError={error ? mapErrorToCode(error) : null}
                    notice={notice}
                    githubEnabled={authFeatures.github}
                    onSubmit={(email, password) => signInWithEmail(email, password)}
                    onGithub={handleGithub}
                    onForgotPassword={handleForgotPassword}
                    onNavigateSignup={goToSignup}
                    onAuthenticated={onAuthenticated}
                    onClearAuthError={clearError}
                  />
                ) : null}

                {view === 'login' && authMethod === 'phone' ? (
                  <PhoneLoginForm
                    operation={operation}
                    serverError={error}
                    onSendCode={(phone) => handlePhoneSendCode(phone, false)}
                    onVerifyCode={handlePhoneVerify}
                    onAuthenticated={onAuthenticated}
                    onClearError={clearError}
                  />
                ) : null}

                {view === 'signup' && authMethod === 'email' ? (
                  <SignupForm
                    operation={operation}
                    githubEnabled={authFeatures.github}
                    onSubmit={handleSignupSubmit}
                    onCompleted={handleSignupCompleted}
                    onNavigateLogin={goToLogin}
                    onGithub={handleGithub}
                  />
                ) : null}

                {view === 'signup' && authMethod === 'phone' ? (
                  <PhoneSignupForm
                    operation={operation}
                    serverError={error}
                    onSendCode={(phone) => handlePhoneSendCode(phone, true)}
                    onVerifyCode={handlePhoneVerify}
                    onAuthenticated={onAuthenticated}
                    onNavigateLogin={goToLogin}
                    onClearError={clearError}
                  />
                ) : null}

                {view === 'verify-otp' ? (
                  <OtpVerificationView
                    email={pendingEmail}
                    operation={operation}
                    serverError={error}
                    onVerify={handleVerifyOtp}
                    onResend={handleResendOtp}
                    onCancel={goToLogin}
                  />
                ) : null}

                {view === 'forgot-password' ? (
                  <ForgotPasswordView
                    operation={operation}
                    serverError={error}
                    onRecover={handleRecover}
                    onComplete={handleCompleteRecovery}
                    onBack={handleForgotBack}
                  />
                ) : null}
              </div>
            </div>

            <AuthTrustNote />
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function mapErrorToCode(error: string | null): import('./auth-types').AuthErrorCode {
  if (!error) return null;
  if (error.includes('Invalid login credentials')) return 'invalid-credentials';
  if (error.includes('already registered') || error.includes('already in use'))
    return 'email-already-in-use';
  if (error.includes('OTP') || error.includes('verification')) return 'invalid-code';
  if (error.includes('rate limit') || error.includes('too many')) return 'rate-limited';
  return 'server-error';
}
