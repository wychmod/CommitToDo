/**
 * Pure, synchronous form validation for the auth modal.
 *
 * Validation is local and side-effect free. Server-level errors (e.g.
 * invalid-credentials) are surfaced through the auth store instead.
 */
import type {
  LoginFormErrors,
  LoginFormValues,
  OtpFormErrors,
  OtpFormValues,
  RecoveryFormErrors,
  RecoveryFormValues,
  SignupFormErrors,
  SignupFormValues,
} from './auth-types';

const EMAIL_REQUIRED = '请输入邮箱';
const EMAIL_INVALID = '请输入有效的邮箱地址';
const PASSWORD_REQUIRED = '请输入密码';
const PASSWORD_TOO_SHORT = '密码至少需要 12 个字符';
const CONFIRM_REQUIRED = '请确认密码';
const CONFIRM_MISMATCH = '两次输入的密码不一致';
const TERMS_REQUIRED = '请阅读并同意服务条款与隐私政策';
const CODE_REQUIRED = '请输入验证码';
const CODE_LENGTH = '验证码为 6 位数字';

const MIN_PASSWORD_LENGTH = 12;
const OTP_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (values.email.trim().length === 0) {
    errors.email = EMAIL_REQUIRED;
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = EMAIL_INVALID;
  }

  if (values.password.length === 0) {
    errors.password = PASSWORD_REQUIRED;
  }

  return errors;
}

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const errors: SignupFormErrors = {};

  if (values.email.trim().length === 0) {
    errors.email = EMAIL_REQUIRED;
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = EMAIL_INVALID;
  }

  let primaryPasswordValid = false;
  if (values.password.length === 0) {
    errors.password = PASSWORD_REQUIRED;
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = PASSWORD_TOO_SHORT;
  } else {
    primaryPasswordValid = true;
  }

  if (values.confirmPassword.length === 0) {
    errors.confirmPassword = CONFIRM_REQUIRED;
  } else if (primaryPasswordValid && values.confirmPassword !== values.password) {
    errors.confirmPassword = CONFIRM_MISMATCH;
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = TERMS_REQUIRED;
  }

  return errors;
}

export function validateOtpForm(values: OtpFormValues): OtpFormErrors {
  const errors: OtpFormErrors = {};
  const digits = values.code.replace(/\s/g, '');

  if (digits.length === 0) {
    errors.code = CODE_REQUIRED;
  } else if (digits.length !== OTP_LENGTH || !/^\d+$/.test(digits)) {
    errors.code = CODE_LENGTH;
  }

  return errors;
}

export function validateRecoveryForm(values: RecoveryFormValues): RecoveryFormErrors {
  const errors: RecoveryFormErrors = {};

  if (values.email.trim().length === 0) {
    errors.email = EMAIL_REQUIRED;
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = EMAIL_INVALID;
  }

  return errors;
}

export function firstLoginErrorField(
  errors: LoginFormErrors
): 'email' | 'password' | null {
  if (errors.email) return 'email';
  if (errors.password) return 'password';
  return null;
}

export function firstSignupErrorField(
  errors: SignupFormErrors
): 'email' | 'password' | 'confirmPassword' | 'acceptedTerms' | null {
  if (errors.email) return 'email';
  if (errors.password) return 'password';
  if (errors.confirmPassword) return 'confirmPassword';
  if (errors.acceptedTerms) return 'acceptedTerms';
  return null;
}
