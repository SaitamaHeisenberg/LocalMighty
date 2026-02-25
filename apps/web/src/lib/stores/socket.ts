import { writable } from 'svelte/store';
import { io, Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { contactsStore } from './contacts';
import { smsStatusStore, type SmsDeliveryStatus } from './smsStatus';

const SERVER_URL = browser ? window.location.origin : 'http://localhost:3001';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

function createSocketStore() {
  const { subscribe, set } = writable<Socket | null>(null);
  let socket: Socket | null = null;

  return {
    subscribe,
    connect: (token?: string) => {
      if (!browser) return null;

      if (socket?.connected) {
        return socket;
      }

      socket = io(SERVER_URL, {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        console.log('Socket connected');
        socket?.emit('join', 'web-clients');
        connectionStatus.set('connected');
      });

      socket.on('contacts_sync_complete', (data: { count: number }) => {
        console.log(`Contacts sync complete: ${data.count} contacts`);
        contactsStore.invalidate();
        contactsStore.load(true);
      });

      socket.on('sms_status_update', (data: { messageId: string; address: string; status: SmsDeliveryStatus; error?: string }) => {
        console.log(`SMS status update: ${data.address} -> ${data.status}`);
        smsStatusStore.updateStatus(data);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        connectionStatus.set('disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        connectionStatus.set('error');
      });

      set(socket);
      connectionStatus.set('connecting');

      return socket;
    },
    disconnect: () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        set(null);
        connectionStatus.set('disconnected');
      }
    },
    getSocket: () => socket,
  };
}

export const socketStore = createSocketStore();
export const connectionStatus = writable<ConnectionStatus>('disconnected');
