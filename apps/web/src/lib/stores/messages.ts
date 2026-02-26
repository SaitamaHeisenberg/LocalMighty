import { writable, derived } from 'svelte/store';
import { socketStore } from './socket';
import { browser } from '$app/environment';
import { apiUrl } from '$lib/api';
import { desktopNotifications } from '$lib/services/desktopNotifications';
import { offlineCache } from '$lib/services/offlineCache';

export interface SmsMessage {
  id: string;
  threadId: string;
  address: string;
  body: string;
  date: number;
  type: 'inbox' | 'sent' | 'draft' | 'outbox';
  read: boolean;
}

export interface SmsThread {
  threadId: string;
  address: string;
  contactName?: string;
  lastMessage: string;
  lastDate: number;
  unreadCount: number;
}

export interface SearchResult extends SmsMessage {
  contactName?: string;
}

function createMessagesStore() {
  const { subscribe, set, update } = writable<SmsMessage[]>([]);

  return {
    subscribe,
    set,
    update,
    addMessage: (message: SmsMessage) => {
      update((messages) => {
        const exists = messages.findIndex((m) => m.id === message.id);
        if (exists >= 0) {
          messages[exists] = message;
          return [...messages];
        }
        return [...messages, message].sort((a, b) => a.date - b.date);
      });
    },
    loadThreadMessages: async (threadId: string): Promise<SmsMessage[]> => {
      if (!browser) return [];

      // Try cache first for instant display
      const cached = offlineCache.getMessages(threadId);
      if (cached && cached.length > 0) {
        set(cached);
      }

      try {
        const res = await fetch(apiUrl(`/api/messages/thread/${threadId}`));
        if (!res.ok) throw new Error('Failed to load messages');
        const messages = await res.json();
        set(messages);
        offlineCache.saveMessages(threadId, messages);
        return messages;
      } catch (error) {
        console.error('Failed to load thread messages:', error);
        // Return cached data if available
        if (cached && cached.length > 0) {
          return cached;
        }
        return [];
      }
    },
    clear: () => set([]),
  };
}

function createThreadsStore() {
  const { subscribe, set, update } = writable<SmsThread[]>([]);

  return {
    subscribe,
    set,
    update,
    load: async (): Promise<SmsThread[]> => {
      if (!browser) return [];

      // Try cache first for instant display
      const cached = offlineCache.getThreads();
      if (cached && cached.length > 0) {
        set(cached);
      }

      try {
        const res = await fetch(apiUrl('/api/messages/threads'));
        if (!res.ok) throw new Error('Failed to load threads');
        const threads = await res.json();
        set(threads);
        offlineCache.saveThreads(threads);
        return threads;
      } catch (error) {
        console.error('Failed to load threads:', error);
        // Return cached data if available
        if (cached && cached.length > 0) {
          return cached;
        }
        return [];
      }
    },
    updateThread: (threadId: string, lastMessage: string, lastDate: number, address?: string) => {
      update((threads) => {
        const idx = threads.findIndex((t) => t.threadId === threadId);
        if (idx >= 0) {
          threads[idx] = { ...threads[idx], lastMessage, lastDate };
          return [...threads].sort((a, b) => b.lastDate - a.lastDate);
        }
        // Thread doesn't exist, add it
        if (address) {
          return [{
            threadId,
            address,
            lastMessage,
            lastDate,
            unreadCount: 1
          }, ...threads];
        }
        return threads;
      });
    },
    deleteThread: async (threadId: string): Promise<boolean> => {
      console.log('[STORE] deleteThread called with:', threadId);
      if (!browser) {
        console.log('[STORE] Not in browser, returning false');
        return false;
      }

      try {
        const url = apiUrl(`/api/messages/thread/${threadId}`);
        console.log('[STORE] Fetching DELETE:', url);
        const res = await fetch(url, {
          method: 'DELETE'
        });
        console.log('[STORE] Response status:', res.status, res.ok);
        if (!res.ok) throw new Error('Failed to delete thread');

        // Remove from local store
        console.log('[STORE] Updating store...');
        update((threads) => threads.filter((t) => t.threadId !== threadId));

        // Clear from cache
        console.log('[STORE] Clearing cache...');
        offlineCache.clearThread(threadId);

        console.log('[STORE] Delete successful, returning true');
        return true;
      } catch (error) {
        console.error('[STORE] Delete failed:', error);
        return false;
      }
    },
  };
}

export const messagesStore = createMessagesStore();
export const threadsStore = createThreadsStore();

// Search store
function createSearchStore() {
  const { subscribe, set } = writable<SearchResult[]>([]);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastQuery = '';

  return {
    subscribe,
    search: async (query: string): Promise<SearchResult[]> => {
      if (!browser) return [];

      // Debounce
      if (searchTimeout) clearTimeout(searchTimeout);

      // Min 2 characters
      if (query.length < 2) {
        set([]);
        lastQuery = '';
        return [];
      }

      // Same query, skip
      if (query === lastQuery) return [];

      return new Promise((resolve) => {
        searchTimeout = setTimeout(async () => {
          try {
            lastQuery = query;
            const res = await fetch(apiUrl(`/api/messages/search?q=${encodeURIComponent(query)}`));
            if (!res.ok) throw new Error('Search failed');
            const results = await res.json();
            set(results);
            resolve(results);
          } catch (error) {
            console.error('Search failed:', error);
            set([]);
            resolve([]);
          }
        }, 300); // 300ms debounce
      });
    },
    clear: () => {
      lastQuery = '';
      set([]);
    }
  };
}

export const searchStore = createSearchStore();

// Setup socket listeners
if (browser) {
  socketStore.subscribe((socket) => {
    if (socket) {
      socket.on('update_sms', (message: SmsMessage & { contactName?: string }) => {
        console.log('New SMS received:', message.address);
        messagesStore.addMessage(message);
        threadsStore.updateThread(message.threadId, message.body, message.date, message.address);

        // Cache the new message
        offlineCache.addMessage(message);

        // Show desktop notification for incoming messages
        if (message.type === 'inbox') {
          desktopNotifications.showSms(
            message.contactName || '',
            message.address,
            message.body,
            message.threadId
          );
        }
      });

      // Load threads when socket connects
      socket.on('connect', () => {
        console.log('Socket connected, loading threads...');
        threadsStore.load();
      });

      socket.on('sms_sync_complete', ({ count }: { count: number }) => {
        console.log(`SMS sync complete: ${count} messages`);
        threadsStore.load();
      });
    }
  });
}
