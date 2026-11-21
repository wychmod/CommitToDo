import { describe, expect, it } from 'vitest';
import {
  authFailureCode,
  authFailureReason,
  isValidEmail,
  normalizeEmail,
  passwordsMatch,
} from './auth-form';

describe('isValidEmail', () => {
  it('去掉首尾空格后 a@b.c 通过', () => {
    expect(normalizeEmail('  a@b.c  ')).toBe('a@b.c');
    expect(isValidEmail('  a@b.c  ')).toBe(true);
  });

  it('缺少域名点、多 @ 与空串都不通过', () => {
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a@@b.c')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
    expect(isValidEmail('@b.c')).toBe(false);
    expect(isValidEmail('a@')).toBe(false);
  });
});

describe('passwordsMatch', () => {
  it('完全一致才通过', () => {
    expect(passwordsMatch('secret123', 'secret123')).toBe(true);
  });

  it('只差大小写或尾部空白都视为不一致', () => {
    expect(passwordsMatch('Secret123', 'secret123')).toBe(false);
    expect(passwordsMatch('secret123 ', 'secret123')).toBe(false);
  });
});

describe('authFailureReason', () => {
  it('密码错误与账号不存在映射到同一错误码', () => {
    expect(authFailureReason('INVALID_CREDENTIALS')).toBe('credentials');
    expect(authFailureReason('USER_NOT_FOUND')).toBe('credentials');
    expect(authFailureCode(authFailureReason('INVALID_CREDENTIALS'))).toBe(
      authFailureCode(authFailureReason('USER_NOT_FOUND')),
    );
    expect(authFailureCode('credentials')).toBe('auth.invalid_credentials');
  });

  it('邮箱已注册单独提示，服务不可用与网络失败可重试', () => {
    expect(authFailureReason(undefined, 'USER_ALREADY_EXISTS')).toBe('emailTaken');
    expect(authFailureReason('PROVIDER_NOT_ENABLED')).toBe('unavailable');
    expect(authFailureReason('SERVICE_ERROR')).toBe('retry');
    expect(authFailureReason('RATE_LIMITED')).toBe('retry');
    expect(authFailureCode('retry')).toBe('storage.write_failed');
  });
});
