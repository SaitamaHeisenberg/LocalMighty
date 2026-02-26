import { browser } from '$app/environment';
import type { SmsMessage, SmsThread } from '$lib/stores/messages';

const CACHE_KEY_THREADS = 'localmighty_cache_threads';
const CACHE_KEY_MESSAGES = 'localmighty_cache_messages';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class OfflineCacheService {
  // Threads cache
  saveThreads(threads: SmsThread[]): void {
    if (!browser) return;
    const entry: CacheEntry<SmsThread[]> = {
      data: threads,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(CACHE_KEY_THREADS, JSON.stringify(entry));
    } catch (e) {
      console.warn('Failed to cache threads:', e);
      this.clearOldData();
    }
  }

  getThreads(): SmsThread[] | null {
    if (!browser) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY_THREADS);
      if (!raw) return null;
      const entry: CacheEntry<SmsThread[]> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(CACHE_KEY_THREADS);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  // Messages cache (per thread)
  saveMessages(threadId: string, messages: SmsMessage[]): void {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(CACHE_KEY_MESSAGES);
      const cache: Record<string, CacheEntry<SmsMessage[]>> = raw ? JSON.parse(raw) : {};
      cache[threadId] = {
        data: messages.slice(-100), // Keep last 100 messages per thread
        timestamp: Date.now(),
      };
      // Limit to 20 threads in cache
      const threadIds = Object.keys(cache);
      if (threadIds.length > 20) {
        const sorted = threadIds.sort((a, b) => cache[b].timestamp - cache[a].timestamp);
        for (const id of sorted.slice(20)) {
          delete cache[id];
        }
      }
      localStorage.setItem(CACHE_KEY_MESSAGES, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to cache messages:', e);
      this.clearOldData();
    }
  }

  getMessages(threadId: string): SmsMessage[] | null {
    if (!browser) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY_MESSAGES);
      if (!raw) return null;
      const cache: Record<string, CacheEntry<SmsMessage[]>> = JSON.parse(raw);
      const entry = cache[threadId];
      if (!entry) return null;
      if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
        delete cache[threadId];
        localStorage.setItem(CACHE_KEY_MESSAGES, JSON.stringify(cache));
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  // Add single message to cache
  addMessage(message: SmsMessage): void {
    if (!browser) return;
    const cached = this.getMessages(message.threadId);
    if (cached) {
      const exists = cached.findIndex(m => m.id === message.id);
      if (exists >= 0) {
        cached[exists] = message;
      } else {
        cached.push(message);
      }
      this.saveMessages(message.threadId, cached);
    }
  }

  // Clear old data when storage is full
  private clearOldData(): void {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(CACHE_KEY_MESSAGES);
      if (raw) {
        const cache: Record<string, CacheEntry<SmsMessage[]>> = JSON.parse(raw);
        const threadIds = Object.keys(cache);
        if (threadIds.length > 5) {
          const sorted = threadIds.sort((a, b) => cache[b].timestamp - cache[a].timestamp);
          for (const id of sorted.slice(5)) {
            delete cache[id];
          }
          localStorage.setItem(CACHE_KEY_MESSAGES, JSON.stringify(cache));
        }
      }
    } catch {
      localStorage.removeItem(CACHE_KEY_MESSAGES);
    }
  }

  // Check if we have cached data
  hasCachedData(): boolean {
    return this.getThreads() !== null;
  }

  // Get cache age in minutes
  getCacheAge(): number | null {
    if (!browser) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY_THREADS);
      if (!raw) return null;
      const entry: CacheEntry<SmsThread[]> = JSON.parse(raw);
      return Math.round((Date.now() - entry.timestamp) / 60000);
    } catch {
      return null;
    }
  }

  // Clear specific thread from cache
  clearThread(threadId: string): void {
    if (!browser) return;
    try {
      // Remove from messages cache
      const raw = localStorage.getItem(CACHE_KEY_MESSAGES);
      if (raw) {
        const cache: Record<string, CacheEntry<SmsMessage[]>> = JSON.parse(raw);
        delete cache[threadId];
        localStorage.setItem(CACHE_KEY_MESSAGES, JSON.stringify(cache));
      }

      // Remove from threads cache
      const threadsRaw = localStorage.getItem(CACHE_KEY_THREADS);
      if (threadsRaw) {
        const entry: CacheEntry<SmsThread[]> = JSON.parse(threadsRaw);
        entry.data = entry.data.filter(t => t.threadId !== threadId);
        localStorage.setItem(CACHE_KEY_THREADS, JSON.stringify(entry));
      }
    } catch (e) {
      console.warn('Failed to clear thread from cache:', e);
    }
  }

  // Clear all cache
  clearAll(): void {
    if (!browser) return;
    localStorage.removeItem(CACHE_KEY_THREADS);
    localStorage.removeItem(CACHE_KEY_MESSAGES);
  }
}

export const offlineCache = new OfflineCacheService();
