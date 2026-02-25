import { writable, derived } from 'svelte/store';
import { threadsStore } from './messages';
import { browser } from '$app/environment';

// Derive unread SMS count from threads
export const unreadSmsCount = derived(threadsStore, ($threads) => {
  return $threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
});

// Unread notifications count (managed separately)
function createUnreadNotificationsStore() {
  const { subscribe, set, update } = writable(0);

  return {
    subscribe,
    set,
    increment: () => update((n) => n + 1),
    decrement: () => update((n) => Math.max(0, n - 1)),
    reset: () => set(0),
  };
}

export const unreadNotificationsCount = createUnreadNotificationsStore();

// Missed calls count - tracks calls not yet seen by user
function createMissedCallsStore() {
  const STORAGE_KEY = 'localmighty_last_seen_call';
  const { subscribe, set, update } = writable(0);

  return {
    subscribe,
    set,
    increment: () => update((n) => n + 1),
    reset: () => set(0),
    getLastSeenTimestamp: (): number => {
      if (!browser) return 0;
      return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    },
    markAsSeen: () => {
      if (browser) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      }
      set(0);
    }
  };
}

export const missedCallsCount = createMissedCallsStore();

// Total unread count
export const totalUnreadCount = derived(
  [unreadSmsCount, unreadNotificationsCount, missedCallsCount],
  ([$sms, $notifs, $calls]) => $sms + $notifs + $calls
);
