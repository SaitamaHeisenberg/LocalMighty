import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { socketStore, connectionStatus } from './socket';
import { toast } from './toast';

export interface QueuedSms {
  id: string;
  address: string;
  body: string;
  createdAt: number;
  status: 'pending' | 'sending' | 'failed';
  retries: number;
}

const STORAGE_KEY = 'localmighty_sms_queue';
const MAX_RETRIES = 3;

function createOfflineQueueStore() {
  const initial: QueuedSms[] = browser
    ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    : [];

  const { subscribe, set, update } = writable<QueuedSms[]>(initial);

  // Persist to localStorage
  if (browser) {
    subscribe((queue) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    });
  }

  return {
    subscribe,

    add: (address: string, body: string): string => {
      const id = crypto.randomUUID();
      const sms: QueuedSms = {
        id,
        address,
        body,
        createdAt: Date.now(),
        status: 'pending',
        retries: 0,
      };

      update((queue) => [...queue, sms]);
      return id;
    },

    remove: (id: string) => {
      update((queue) => queue.filter((sms) => sms.id !== id));
    },

    updateStatus: (id: string, status: QueuedSms['status']) => {
      update((queue) =>
        queue.map((sms) =>
          sms.id === id ? { ...sms, status, retries: sms.retries + (status === 'failed' ? 1 : 0) } : sms
        )
      );
    },

    clear: () => set([]),

    processQueue: async () => {
      const status = get(connectionStatus);
      if (status !== 'connected') return;

      const socket = socketStore.getSocket();
      if (!socket) return;

      const queue = get({ subscribe });
      const pending = queue.filter((sms) => sms.status === 'pending' && sms.retries < MAX_RETRIES);

      for (const sms of pending) {
        update((q) => q.map((s) => (s.id === sms.id ? { ...s, status: 'sending' } : s)));

        socket.emit('send_sms', {
          address: sms.address,
          body: sms.body,
        });

        // Remove from queue after sending
        update((q) => q.filter((s) => s.id !== sms.id));
        toast(`SMS envoye a ${sms.address}`, 'success');
      }
    },

    getPendingCount: (): number => {
      const queue = get({ subscribe });
      return queue.filter((sms) => sms.status === 'pending').length;
    },
  };
}

export const offlineQueue = createOfflineQueueStore();

// Auto-process queue when connection is restored
if (browser) {
  connectionStatus.subscribe((status) => {
    if (status === 'connected') {
      setTimeout(() => {
        const count = offlineQueue.getPendingCount();
        if (count > 0) {
          toast(`Envoi de ${count} SMS en attente...`, 'info');
          offlineQueue.processQueue();
        }
      }, 1000);
    }
  });
}
