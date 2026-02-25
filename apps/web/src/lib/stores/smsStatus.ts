import { writable, get } from 'svelte/store';
import { toast } from './toast';
import { browser } from '$app/environment';

export type SmsDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface SmsStatusEntry {
  messageId: string;
  address: string;
  status: SmsDeliveryStatus;
  timestamp: number;
  error?: string;
}

function createSmsStatusStore() {
  const { subscribe, set, update } = writable<Map<string, SmsStatusEntry>>(new Map());

  return {
    subscribe,

    // Called when we send an SMS
    markSending: (address: string): string => {
      const messageId = `local_${Date.now()}`;
      update((map) => {
        map.set(messageId, {
          messageId,
          address,
          status: 'sending',
          timestamp: Date.now(),
        });
        return map;
      });
      return messageId;
    },

    // Update status from server event
    updateStatus: (data: { messageId: string; address: string; status: SmsDeliveryStatus; error?: string }) => {
      update((map) => {
        const existing = map.get(data.messageId);
        map.set(data.messageId, {
          messageId: data.messageId,
          address: data.address,
          status: data.status,
          timestamp: Date.now(),
          error: data.error,
        });
        return map;
      });

      // Show toast for status changes
      if (browser) {
        switch (data.status) {
          case 'sent':
            toast(`SMS envoye a ${data.address}`, 'success');
            break;
          case 'delivered':
            toast(`SMS livre a ${data.address}`, 'success');
            break;
          case 'failed':
            toast(`Echec envoi a ${data.address}: ${data.error || 'Erreur inconnue'}`, 'error');
            break;
        }
      }
    },

    // Get status for a specific message
    getStatus: (messageId: string): SmsStatusEntry | undefined => {
      return get({ subscribe }).get(messageId);
    },

    // Get latest status for an address
    getLatestForAddress: (address: string): SmsStatusEntry | undefined => {
      const map = get({ subscribe });
      let latest: SmsStatusEntry | undefined;
      map.forEach((entry) => {
        if (entry.address === address && (!latest || entry.timestamp > latest.timestamp)) {
          latest = entry;
        }
      });
      return latest;
    },

    // Clear old entries (older than 5 minutes)
    cleanup: () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      update((map) => {
        const newMap = new Map<string, SmsStatusEntry>();
        map.forEach((entry, key) => {
          if (entry.timestamp > fiveMinutesAgo) {
            newMap.set(key, entry);
          }
        });
        return newMap;
      });
    },
  };
}

export const smsStatusStore = createSmsStatusStore();

// Cleanup old entries periodically
if (browser) {
  setInterval(() => {
    smsStatusStore.cleanup();
  }, 60000);
}
