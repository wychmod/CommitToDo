import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WebNotificationService } from './web-notification-service';

describe('WebNotificationService', () => {
  let service: WebNotificationService;

  beforeEach(() => {
    service = new WebNotificationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when Notification API is unavailable', () => {
    Object.defineProperty(globalThis, 'Notification', { value: undefined, configurable: true });
    expect(service.isSupported()).toBe(false);
  });

  it('requests permission when supported', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission },
      configurable: true,
    });
    const newService = new WebNotificationService();
    const result = await newService.requestPermission();
    expect(result).toBe('granted');
  });

  it('does not notify without permission', async () => {
    const notificationSpy = vi.fn();
    Object.defineProperty(globalThis, 'Notification', {
      value: vi.fn().mockImplementation(notificationSpy),
      configurable: true,
    });
    Object.defineProperty(globalThis.Notification, 'permission', { value: 'denied' });
    await service.notify({ title: 'Test' });
    expect(notificationSpy).not.toHaveBeenCalled();
  });
});
