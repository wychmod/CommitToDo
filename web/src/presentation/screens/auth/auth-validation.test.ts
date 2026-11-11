import { describe, expect, it } from 'vitest';

import {
  firstLoginErrorField,
  firstSignupErrorField,
  validateLoginForm,
  validateSignupForm,
} from './auth-validation';
import type {
  LoginFormValues,
  SignupFormValues,
} from './auth-types';

const validLogin: LoginFormValues = {
  email: 'admin@example.com',
  password: 'password12345',
};

const validSignup: SignupFormValues = {
  email: 'someone@example.com',
  password: 'password12345',
  confirmPassword: 'password12345',
  acceptedTerms: true,
};

describe('validateLoginForm', () => {
  it('returns no errors for a complete login', () => {
    const errors = validateLoginForm(validLogin);

    expect(errors).toEqual({});
  });

  it('flags an empty email', () => {
    const errors = validateLoginForm({ ...validLogin, email: '' });

    expect(errors.email).toBe('请输入邮箱');
    expect(errors.password).toBeUndefined();
    expect(errors.form).toBeUndefined();
  });

  it('flags an invalid email', () => {
    const errors = validateLoginForm({ ...validLogin, email: 'not-an-email' });

    expect(errors.email).toBe('请输入有效的邮箱地址');
  });

  it('treats a whitespace-only email as empty', () => {
    const errors = validateLoginForm({ ...validLogin, email: '   ' });

    expect(errors.email).toBe('请输入邮箱');
  });

  it('flags an empty password but keeps a valid email', () => {
    const errors = validateLoginForm({ ...validLogin, password: '' });

    expect(errors.password).toBe('请输入密码');
    expect(errors.email).toBeUndefined();
  });

  it('flags both fields when both are empty', () => {
    const errors = validateLoginForm({
      email: '',
      password: '',
    });

    expect(errors.email).toBe('请输入邮箱');
    expect(errors.password).toBe('请输入密码');
  });

  it('does not compare credentials against any fixed value', () => {
    // Credential matching lives in the repository / store, not in the sync validator.
    const errors = validateLoginForm({
      email: 'wrong@example.com',
      password: 'wrong',
    });

    expect(errors).toEqual({});
  });

  it('does not mutate the input values', () => {
    const input: LoginFormValues = { ...validLogin };

    validateLoginForm(input);

    expect(input).toEqual(validLogin);
  });
});

describe('validateSignupForm', () => {
  it('returns no errors for a valid registration', () => {
    const errors = validateSignupForm(validSignup);

    expect(errors).toEqual({});
  });

  it('flags an empty email', () => {
    const errors = validateSignupForm({ ...validSignup, email: '' });

    expect(errors.email).toBe('请输入邮箱');
  });

  it('flags an invalid email', () => {
    const errors = validateSignupForm({ ...validSignup, email: 'invalid' });

    expect(errors.email).toBe('请输入有效的邮箱地址');
  });

  it('treats a whitespace-only email as empty', () => {
    const errors = validateSignupForm({ ...validSignup, email: '\t' });

    expect(errors.email).toBe('请输入邮箱');
  });

  it('flags an empty password', () => {
    const errors = validateSignupForm({ ...validSignup, password: '' });

    expect(errors.password).toBe('请输入密码');
    expect(errors.confirmPassword).toBeUndefined();
  });

  it('flags a password shorter than 8 characters', () => {
    const errors = validateSignupForm({
      ...validSignup,
      password: '1234',
      confirmPassword: '1234',
    });

    expect(errors.password).toBe('密码至少需要 12 个字符');
  });

  it('flags an empty confirm password separately from a mismatch', () => {
    const errors = validateSignupForm({
      ...validSignup,
      confirmPassword: '',
    });

    expect(errors.confirmPassword).toBe('请确认密码');
  });

  it('flags a password mismatch', () => {
    const errors = validateSignupForm({
      ...validSignup,
      confirmPassword: 'different',
    });

    expect(errors.confirmPassword).toBe('两次输入的密码不一致');
  });

  it('flags an unchecked terms box', () => {
    const errors = validateSignupForm({ ...validSignup, acceptedTerms: false });

    expect(errors.acceptedTerms).toBe('请阅读并同意服务条款与隐私政策');
  });

  it('does not mutate the input values', () => {
    const input: SignupFormValues = { ...validSignup };

    validateSignupForm(input);

    expect(input).toEqual(validSignup);
  });
});

describe('firstLoginErrorField', () => {
  it('returns null when there are no errors', () => {
    expect(firstLoginErrorField({})).toBeNull();
  });

  it('prefers email over password', () => {
    expect(
      firstLoginErrorField({ email: '请输入邮箱', password: '请输入密码' })
    ).toBe('email');
  });

  it('returns password when only password errors', () => {
    expect(firstLoginErrorField({ password: '请输入密码' })).toBe('password');
  });

  it('ignores form-level errors', () => {
    expect(firstLoginErrorField({ form: '账号或密码不正确' })).toBeNull();
  });
});

describe('firstSignupErrorField', () => {
  it('returns null when there are no errors', () => {
    expect(firstSignupErrorField({})).toBeNull();
  });

  it('follows the visual field order email -> password -> confirmPassword -> acceptedTerms', () => {
    expect(
      firstSignupErrorField({
        email: 'e',
        password: 'e',
        confirmPassword: 'e',
        acceptedTerms: 'e',
      })
    ).toBe('email');

    expect(
      firstSignupErrorField({
        password: 'e',
        confirmPassword: 'e',
        acceptedTerms: 'e',
      })
    ).toBe('password');

    expect(
      firstSignupErrorField({
        confirmPassword: 'e',
        acceptedTerms: 'e',
      })
    ).toBe('confirmPassword');

    expect(firstSignupErrorField({ acceptedTerms: 'e' })).toBe('acceptedTerms');
  });
});
