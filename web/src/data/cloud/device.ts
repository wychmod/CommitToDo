import { systemClock } from '@/core/clock';
import { systemIds } from '@/core/ids';

/**
 * 匿名设备标识（PRD V1-06 §4.3 / OP-08）。
 *
 * 只用于异地备份列表区分设备，不采集邮箱、账号或任何身份字段。
 * 标识留在本机 `localStorage`；浏览器禁用存储时退化为本次会话随机值。
 */

const DEVICE_STORAGE_KEY = 'committo.remote-device';

export function anonymousDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    const id = systemIds.ulid(systemClock.now());
    window.localStorage.setItem(DEVICE_STORAGE_KEY, id);
    return id;
  } catch {
    return systemIds.ulid(systemClock.now());
  }
}

/** 浏览器名称，供「本机 · Chrome」一类的匿名标签使用。 */
export function anonymousDeviceName(): string {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Browser';
}
