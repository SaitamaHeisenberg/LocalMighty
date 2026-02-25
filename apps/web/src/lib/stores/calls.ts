import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { apiUrl } from '$lib/api';

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
