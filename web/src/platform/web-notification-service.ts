export interface NotificationPayload {
  title: string;
  body?: string;
  tag?: string;
}

export class WebNotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof Notification !== 'undefined') {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }
    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  isSupported(): boolean {
    return typeof Notification !== 'undefined';
  }

  async notify(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported() || this.permission !== 'granted') {
      return;
    }
    try {
      new Notification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: './icons/icon-192x192.png',
      });
    } catch {
      // Ignore notification errors.
    }
  }
}
