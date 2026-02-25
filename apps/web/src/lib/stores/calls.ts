import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { apiUrl } from '$lib/api';
import { socketStore } from './socket';
import { missedCallsCount } from './unread';
import { desktopNotifications } from '$lib/services/desktopNotifications';

export type CallType = 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'voicemail';

export interface CallLogEntry {
  id: string;
  number: string;
  contactName?: string;
  type: CallType;
  date: number;
  duration: number;
}

function createCallsStore() {
  const { subscribe, set, update } = writable<CallLogEntry[]>([]);

  let loading = false;

  return {
    subscribe,
    set,
    update,

    load: async (): Promise<CallLogEntry[]> => {
      if (!browser || loading) return get({ subscribe });

      loading = true;
      try {
        const res = await fetch(apiUrl('/api/calls?limit=200'));
        if (!res.ok) throw new Error('Failed to load calls');
        const calls = await res.json();
        set(calls);

        // Count missed calls since last seen
        const lastSeen = missedCallsCount.getLastSeenTimestamp();
        const newMissedCount = calls.filter(
          (c: CallLogEntry) => c.type === 'missed' && c.date > lastSeen
        ).length;
        missedCallsCount.set(newMissedCount);

        return calls;
      } catch (error) {
        console.error('Failed to load calls:', error);
        return [];
      } finally {
        loading = false;
      }
    },

    addCall: (call: CallLogEntry) => {
      update(calls => [call, ...calls]);
    },

    getByType: (type: CallType): CallLogEntry[] => {
      return get({ subscribe }).filter(c => c.type === type);
    },

    getMissedCount: (): number => {
      return get({ subscribe }).filter(c => c.type === 'missed').length;
    }
  };
}

export const callsStore = createCallsStore();

// Setup socket listeners for calls
if (browser) {
  socketStore.subscribe((socket) => {
    if (socket) {
      socket.on('call_log_update', (call: CallLogEntry) => {
        console.log('Call log update:', call.type, call.number);
        callsStore.addCall(call);

        // Show notification and increment counter for missed calls
        if (call.type === 'missed') {
          missedCallsCount.increment();
          desktopNotifications.showMissedCall(call.contactName || '', call.number);
        }
      });
    }
  });
}
