import { writable, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { apiUrl } from '$lib/api';

// Hub socket events (mirrors @localmighty/shared constants)
const HUB_EVENTS = {
  TEXT_UPDATE: 'hub:text:update',
  TEXT_REQUEST: 'hub:text:request',
  TEXT_SYNC: 'hub:text:sync',
  FILE_NEW: 'hub:file:new',
  FILE_DELETED: 'hub:file:deleted',
} as const;

interface HubText {
  id: string;
  content: string;
  authorIp: string;
  updatedAt: number;
}

export type HubFileRetention = '1h' | '24h' | '7d' | 'unlimited';

export interface HubFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploaderIp: string;
  createdAt: number;
  expiresAt: number | null;
  retention: HubFileRetention;
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
  const files = writable<HubFile[]>([]);
  const uploading = writable(false);
  const uploadProgress = writable(0);

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
      // Load files list
      loadFiles();
    });

    socket.on(HUB_EVENTS.TEXT_SYNC, (data: HubText) => {
      isRemoteUpdate = true;
      text.set(data.content);
      syncStatus.set('synced');
      isRemoteUpdate = false;
    });

    // Real-time file events
    socket.on(HUB_EVENTS.FILE_NEW, (file: HubFile) => {
      files.update((list) => [file, ...list]);
    });

    socket.on(HUB_EVENTS.FILE_DELETED, (payload: { id: string }) => {
      files.update((list) => list.filter((f) => f.id !== payload.id));
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

  // ===== File management =====

  async function loadFiles() {
    try {
      const res = await fetch(apiUrl('/api/hub/files'));
      if (res.ok) {
        const data: HubFile[] = await res.json();
        files.set(data);
      }
    } catch (err) {
      console.error('[HUB] Failed to load files:', err);
    }
  }

  async function uploadFile(file: File, retention: HubFileRetention = '24h'): Promise<HubFile | null> {
    uploading.set(true);
    uploadProgress.set(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('retention', retention);

      // Use XMLHttpRequest for progress tracking
      return await new Promise<HubFile | null>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl('/api/hub/upload'));

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            uploadProgress.set(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const hubFile: HubFile = JSON.parse(xhr.responseText);
            resolve(hubFile);
          } else {
            console.error('[HUB] Upload failed:', xhr.status, xhr.statusText);
            resolve(null);
          }
        });

        xhr.addEventListener('error', () => {
          console.error('[HUB] Upload network error');
          reject(new Error('Network error'));
        });

        xhr.send(formData);
      });
    } catch (err) {
      console.error('[HUB] Upload error:', err);
      return null;
    } finally {
      uploading.set(false);
      uploadProgress.set(0);
    }
  }

  async function deleteFile(id: string): Promise<boolean> {
    try {
      const res = await fetch(apiUrl(`/api/hub/files/${id}`), { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error('[HUB] Delete error:', err);
      return false;
    }
  }

  return {
    text: { subscribe: text.subscribe },
    syncStatus: { subscribe: syncStatus.subscribe },
    files: { subscribe: files.subscribe },
    uploading: { subscribe: uploading.subscribe },
    uploadProgress: { subscribe: uploadProgress.subscribe },
    connect,
    disconnect,
    updateText,
    getText: () => get(text),
    loadFiles,
    uploadFile,
    deleteFile,
  };
}

export const hubStore = createHubStore();
