import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    add: (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      const duration = toast.duration ?? 3000;

      update((toasts) => [...toasts, { ...toast, id }]);

      if (duration > 0) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    remove: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
    success: (message: string, duration?: number) => {
      return createToastStore().add({ type: 'success', message, duration });
    },
    error: (message: string, duration?: number) => {
      return createToastStore().add({ type: 'error', message, duration });
    },
    warning: (message: string, duration?: number) => {
      return createToastStore().add({ type: 'warning', message, duration });
    },
    info: (message: string, duration?: number) => {
      return createToastStore().add({ type: 'info', message, duration });
    },
  };
}

export const toasts = createToastStore();

export function addToast(toast: Omit<Toast, 'id'>) {
  return toasts.add(toast);
}

export function removeToast(id: string) {
  toasts.remove(id);
}

export function toast(message: string, type: Toast['type'] = 'info', duration?: number) {
  return toasts.add({ type, message, duration });
}
