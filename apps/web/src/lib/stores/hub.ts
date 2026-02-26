import { writable, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

// Hub socket events (mirrors @localmighty/shared constants)
const HUB_EVENTS = {
  TEXT_UPDATE: 'hub:text:update',
  TEXT_REQUEST: 'hub:text:request',
  TEXT_SYNC: 'hub:text:sync',
} as const;

interface HubText {
  id: string;
  content: string;
  authorIp: string;
  updatedAt: number;
}

function getServerUrl(): string {
  if (!browser) return 'http://localhost:3001';
  const { hostname } = window.location;
  return `http://${hostname}:3001`;
}

export type HubSyncStatus = 'disconnected' | 'connected' | 'syncing' | 'synced';

function createHubStore() {
  const text = writable('');
  const syncStatus = writable<HubSyncStatus>('disconnected');

  let socket: Socket | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isRemoteUpdate = false;

  function connect() {
    if (!browser || socket?.connected) return;

    socket = io(getServerUrl() + '/share', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[HUB] Connected to /share namespace');
      syncStatus.set('connected');
      // Request current clipboard content
      socket!.emit(HUB_EVENTS.TEXT_REQUEST);
    });

    socket.on(HUB_EVENTS.TEXT_SYNC, (data: HubText) => {
      isRemoteUpdate = true;
      text.set(data.content);
      syncStatus.set('synced');
      isRemoteUpdate = false;
    });

    socket.on('disconnect', () => {
      console.log('[HUB] Disconnected from /share namespace');
      syncStatus.set('disconnected');
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[HUB] Connection error:', err.message);
      syncStatus.set('disconnected');
    });
  }

  function disconnect() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    syncStatus.set('disconnected');
  }

  function updateText(content: string) {
    // Enforce 10 Ko limit client-side
    if (new Blob([content]).size > 10240) return;

    text.set(content);

    // Don't emit if this was a remote update
    if (isRemoteUpdate) return;

    syncStatus.set('syncing');

    // Debounce 500ms
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (socket?.connected) {
        socket.emit(HUB_EVENTS.TEXT_UPDATE, { content });
        syncStatus.set('synced');
      }
    }, 500);
  }

  return {
    text: { subscribe: text.subscribe },
    syncStatus: { subscribe: syncStatus.subscribe },
    connect,
    disconnect,
    updateText,
    getText: () => get(text),
  };
}

export const hubStore = createHubStore();
