import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export type NotificationType = 'sms' | 'app' | 'call';

interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  type: NotificationType;
  data?: {
    threadId?: string;
    notificationId?: string;
    callId?: string;
  };
}

class DesktopNotificationService {
  private permission: NotificationPermission = 'default';
  private enabled = true;

  constructor() {
    if (browser && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!browser || !('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  isSupported(): boolean {
    return browser && 'Notification' in window;
  }

  isEnabled(): boolean {
    return this.enabled && this.permission === 'granted';
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  show(options: DesktopNotificationOptions): void {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        tag: options.tag,
        badge: '/favicon.png',
        requireInteraction: false,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();

        // Navigate based on notification type
        if (options.type === 'sms' && options.data?.threadId) {
          goto(`/sms/${options.data.threadId}`);
        } else if (options.type === 'app') {
          goto('/notifications');
        } else if (options.type === 'call') {
          goto('/calls');
        }

        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  showSms(contactName: string, address: string, body: string, threadId: string): void {
    this.show({
      title: contactName || address,
      body: body.length > 100 ? body.substring(0, 100) + '...' : body,
      tag: `sms-${threadId}`,
      type: 'sms',
      data: { threadId },
    });
  }

  showAppNotification(appName: string, title: string, text: string, notificationId: string): void {
    this.show({
      title: `${appName}: ${title}`,
      body: text.length > 100 ? text.substring(0, 100) + '...' : text,
      tag: `app-${notificationId}`,
      type: 'app',
      data: { notificationId },
    });
  }

  showMissedCall(contactName: string, number: string): void {
    this.show({
      title: 'Appel manque',
      body: contactName || number,
      tag: `call-${number}`,
      type: 'call',
    });
  }
}

export const desktopNotifications = new DesktopNotificationService();
