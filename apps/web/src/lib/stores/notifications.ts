import { writable } from 'svelte/store';
import { socketStore } from './socket';
import { browser } from '$app/environment';

export interface AppNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  timestamp: number;
  dismissed: boolean;
}

function createNotificationsStore() {
  const { subscribe, set, update } = writable<AppNotification[]>([]);

  return {
    subscribe,
    set,
    update,
    add: (notification: AppNotification) => {
      update((notifications) => {
        const exists = notifications.findIndex((n) => n.id === notification.id);
        if (exists >= 0) {
          notifications[exists] = notification;
          return [...notifications];
        }
        return [notification, ...notifications];
      });
    },
    dismiss: async (id: string) => {
      update((notifications) =>
        notifications.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
      );

      // Also notify server/phone
      const socket = socketStore.getSocket();
      if (socket) {
        socket.emit('dismiss_notif', { id });
      }
    },
    load: async (): Promise<AppNotification[]> => {
      if (!browser) return [];

      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) throw new Error('Failed to load notifications');
        const notifications = await res.json();
        set(notifications);
        return notifications;
      } catch (error) {
        console.error('Failed to load notifications:', error);
        return [];
      }
    },
    clear: () => set([]),
  };
}

export const notificationsStore = createNotificationsStore();

// Setup socket listeners
if (browser) {
  socketStore.subscribe((socket) => {
    if (socket) {
      socket.on('update_notifications', (notification: AppNotification) => {
        if (notification.dismissed) {
          notificationsStore.update((notifications) =>
            notifications.map((n) =>
              n.id === notification.id ? { ...n, dismissed: true } : n
            )
          );
        } else {
          notificationsStore.add(notification);
        }
      });
    }
  });
}
