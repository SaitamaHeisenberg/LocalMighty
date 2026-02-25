import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

const STORAGE_KEY = 'localmighty_contacts';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  contacts: Contact[];
  timestamp: number;
}

function loadFromStorage(): Contact[] {
  if (!browser) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: CachedData = JSON.parse(stored);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data.contacts;
      }
    }
  } catch (e) {
    console.error('Failed to load contacts from storage:', e);
  }
  return [];
}

function saveToStorage(contacts: Contact[]) {
  if (!browser) return;
  try {
    const data: CachedData = { contacts, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save contacts to storage:', e);
  }
}

function createContactsStore() {
  // Load from localStorage immediately for instant display
  const initialContacts = loadFromStorage();
  const { subscribe, set, update } = writable<Contact[]>(initialContacts);

  let cached = initialContacts.length > 0;
  let loading = false;
  let loadPromise: Promise<Contact[]> | null = null;

  const store = {
    subscribe,
    set,
    update,

    load: async (forceRefresh = false): Promise<Contact[]> => {
      if (!browser) return [];

      // If we have cached data, return immediately and refresh in background
      if (cached && !forceRefresh) {
        store.fetchInBackground();
        return get({ subscribe });
      }

      // If already loading, wait for existing request
      if (loading && loadPromise) {
        return loadPromise;
      }

      loading = true;
      loadPromise = (async () => {
        try {
          const res = await fetch('/api/contacts');
          if (!res.ok) throw new Error('Failed to load contacts');
          const contacts = await res.json();
          set(contacts);
          saveToStorage(contacts);
          cached = true;
          return contacts;
        } catch (error) {
          console.error('Failed to load contacts:', error);
          return get({ subscribe });
        } finally {
          loading = false;
          loadPromise = null;
        }
      })();

      return loadPromise;
    },

    fetchInBackground: async () => {
      if (loading) return;
      try {
        const res = await fetch('/api/contacts');
        if (!res.ok) return;
        const contacts = await res.json();
        set(contacts);
        saveToStorage(contacts);
      } catch {
        // Silent fail for background fetch
      }
    },

    invalidate: () => {
      cached = false;
    },

    isLoaded: (): boolean => cached || get({ subscribe }).length > 0,

    search: (query: string): Contact[] => {
      if (!query.trim()) return get({ subscribe });

      const contacts = get({ subscribe });
      const queryLower = query.toLowerCase().trim();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

      // Filter contacts that match
      const filtered = contacts.filter(c => {
        const nameLower = c.name.toLowerCase();

        // Check if ALL query words are found in the name
        const allWordsMatch = queryWords.every(word =>
          nameLower.includes(word)
        );

        // Also check phone numbers
        const phoneMatch = c.phoneNumbers.some(p =>
          p.replace(/\s/g, '').includes(queryLower.replace(/\s/g, ''))
        );

        return allWordsMatch || phoneMatch;
      });

      // Sort: names starting with query first, then alphabetically
      return filtered.sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();

        const aStartsWith = aLower.startsWith(queryWords[0]);
        const bStartsWith = bLower.startsWith(queryWords[0]);

        // Priority 1: starts with first query word
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Priority 2: starts with full query
        const aStartsFull = aLower.startsWith(queryLower);
        const bStartsFull = bLower.startsWith(queryLower);
        if (aStartsFull && !bStartsFull) return -1;
        if (!aStartsFull && bStartsFull) return 1;

        // Priority 3: alphabetical
        return aLower.localeCompare(bLower);
      });
    },

    findByPhone: (phoneNumber: string): Contact | null => {
      const contacts = get({ subscribe });
      const normalized = phoneNumber.replace(/[^0-9+]/g, '');
      const lastDigits = normalized.slice(-9);

      return contacts.find(c =>
        c.phoneNumbers.some(p => p.replace(/[^0-9+]/g, '').endsWith(lastDigits))
      ) || null;
    }
  };

  return store;
}

export const contactsStore = createContactsStore();
