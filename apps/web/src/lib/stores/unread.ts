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

// Total unread count
export const totalUnreadCount = derived(
  [unreadSmsCount, unreadNotificationsCount],
  ([$sms, $notifs]) => $sms + $notifs
);
