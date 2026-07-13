/**
 * Pure, synchronous form validation for the auth modal.
 *
 * Credential matching against `admin` / `admin` is intentionally NOT done here
 * - that lives in the demo auth store so the validator stays free of side
 * effects and secrets. These functions only enforce required / length /
 * consistency rules and never mutate their input.
 */
import type {
  LoginFormErrors,
  LoginFormValues,
  SignupFormErrors,
  SignupFormValues,
} from './auth-types';

const USERNAME_REQUIRED = '请输入账号';
const PASSWORD_REQUIRED = '请输入密码';
const PASSWORD_TOO_SHORT = '密码至少需要 5 个字符';
const CONFIRM_REQUIRED = '请确认密码';
const CONFIRM_MISMATCH = '两次输入的密码不一致';
const TERMS_REQUIRED = '请阅读并同意服务条款与隐私政策';

const MIN_PASSWORD_LENGTH = 5;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (values.username.trim().length === 0) {
    errors.username = USERNAME_REQUIRED;
  }

  if (values.password.length === 0) {
    errors.password = PASSWORD_REQUIRED;
  }

  return errors;
}

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const errors: SignupFormErrors = {};

  if (values.username.trim().length === 0) {
    errors.username = USERNAME_REQUIRED;
  }

  // Only validate the confirmation once the primary password itself is valid,
  // so an empty/short password does not also surface a confusing mismatch.
  let primaryPasswordValid = false;
  if (values.password.length === 0) {
    errors.password = PASSWORD_REQUIRED;
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = PASSWORD_TOO_SHORT;
  } else {
    primaryPasswordValid = true;
  }

  // The empty-confirm check always runs (required field). The mismatch check
  // only runs once the primary password is valid, so an empty/short password
  // does not also surface a confusing mismatch.
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

export function firstLoginErrorField(
  errors: LoginFormErrors
): 'username' | 'password' | null {
  if (errors.username) return 'username';
  if (errors.password) return 'password';
  return null;
}

export function firstSignupErrorField(
  errors: SignupFormErrors
): 'username' | 'password' | 'confirmPassword' | 'acceptedTerms' | null {
  if (errors.username) return 'username';
  if (errors.password) return 'password';
  if (errors.confirmPassword) return 'confirmPassword';
  if (errors.acceptedTerms) return 'acceptedTerms';
  return null;
}
