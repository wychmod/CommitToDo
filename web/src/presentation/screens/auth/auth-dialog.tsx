import '@/core/theme/v3-tokens.css';
import './auth-modal.css';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';
import { AuthBrandHeader } from './auth-brand-header';
import { AuthBranchVisual } from './auth-branch-visual';
import { AuthTabs } from './auth-tabs';
import { AuthTrustNote } from './auth-trust-note';
import { ForgotPasswordView } from './forgot-password-view';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';
import type { AuthView } from './auth-types';

export interface AuthDialogProps {
  open: boolean;
  routeMode: 'login' | 'signup';
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
    title: '找回演示账号',
    description: '演示环境不会发送邮件，固定账号和密码均为 admin。',
  },
};

const REGISTRATION_NOTICE = '演示注册完成，请使用 admin / admin 登录';
const RECOVERY_NOTICE = '演示密码已恢复为 admin';

export function AuthDialog({
  open,
  routeMode,
  onOpenChange,
  onNavigateLogin,
  onNavigateSignup,
  onAuthenticated,
}: AuthDialogProps): JSX.Element {
  const operation = useDemoAuthStore((s) => s.operation);
  const authError = useDemoAuthStore((s) => s.error);
  const signIn = useDemoAuthStore((s) => s.signIn);
  const signInWithGithub = useDemoAuthStore((s) => s.signInWithGithub);
  const simulateRegistration = useDemoAuthStore((s) => s.simulateRegistration);
  const simulateRecovery = useDemoAuthStore((s) => s.simulateRecovery);
  const clearError = useDemoAuthStore((s) => s.clearError);

  const [forgotActive, setForgotActive] = React.useState(false);
  const [usernamePreset, setUsernamePreset] = React.useState<string | undefined>(
    undefined
  );
  const [notice, setNotice] = React.useState<string | undefined>(undefined);

  const bodyRef = React.useRef<HTMLDivElement>(null);

  const view: AuthView = forgotActive ? 'forgot-password' : routeMode;
  const isBusy = operation !== null;
  const copy = VIEW_COPY[view];

  // Fresh state every time the dialog opens: no stale notice, preset, error or
  // forgot sub-view carries over from a previous session.
  React.useEffect(() => {
    if (open) {
      setForgotActive(false);
      setUsernamePreset(undefined);
      setNotice(undefined);
      clearError();
    }
  }, [open, clearError]);

  const goToLogin = (): void => {
    setForgotActive(false);
    setUsernamePreset(undefined);
    setNotice(undefined);
    onNavigateLogin();
  };

  const goToSignup = (): void => {
    setForgotActive(false);
    setUsernamePreset(undefined);
    setNotice(undefined);
    onNavigateSignup();
  };

  const handleTabChange = (next: 'login' | 'signup'): void => {
    if (next === 'login') goToLogin();
    else goToSignup();
  };

  const handleForgotPassword = (): void => {
    setNotice(undefined);
    setUsernamePreset(undefined);
    setForgotActive(true);
  };

  const handleForgotBack = (): void => {
    setForgotActive(false);
  };

  const handleSignupCompleted = (username: 'admin'): void => {
    setUsernamePreset(username);
    setNotice(REGISTRATION_NOTICE);
    setForgotActive(false);
    onNavigateLogin();
  };

  const handleRecovered = (username: 'admin'): void => {
    setUsernamePreset(username);
    setNotice(RECOVERY_NOTICE);
    setForgotActive(false);
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

              {view !== 'forgot-password' ? (
                <div className="mt-5">
                  <AuthTabs
                    value={view}
                    onChange={handleTabChange}
                    disabled={isBusy}
                  />
                </div>
              ) : null}

              <div className="mt-5">
                {view === 'login' ? (
                  <LoginForm
                    usernamePreset={usernamePreset}
                    operation={operation}
                    authError={authError}
                    notice={notice}
                    onSubmit={signIn}
                    onGithub={signInWithGithub}
                    onForgotPassword={handleForgotPassword}
                    onNavigateSignup={goToSignup}
                    onAuthenticated={onAuthenticated}
                    onClearAuthError={clearError}
                  />
                ) : null}

                {view === 'signup' ? (
                  <SignupForm
                    operation={operation}
                    onSubmit={simulateRegistration}
                    onCompleted={handleSignupCompleted}
                    onNavigateLogin={goToLogin}
                  />
                ) : null}

                {view === 'forgot-password' ? (
                  <ForgotPasswordView
                    operation={operation}
                    onRecover={simulateRecovery}
                    onRecovered={handleRecovered}
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
