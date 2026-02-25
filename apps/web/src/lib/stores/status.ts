import { writable } from 'svelte/store';
import { socketStore } from './socket';
import { browser } from '$app/environment';

export interface DeviceStatus {
  batteryLevel: number;
  isCharging: boolean;
  wifiConnected: boolean;
  lastSeen: number;
}

export interface PhoneStatus {
  connected: boolean;
  deviceName?: string;
}

function createStatusStore() {
  const { subscribe, set, update } = writable<DeviceStatus>({
    batteryLevel: 0,
    isCharging: false,
    wifiConnected: false,
    lastSeen: 0,
  });

  return {
    subscribe,
    set,
    update,
  };
}

function createPhoneStatusStore() {
  const { subscribe, set } = writable<PhoneStatus>({
    connected: false,
    deviceName: undefined,
  });

  return {
    subscribe,
    set,
  };
}

export const statusStore = createStatusStore();
export const phoneStatusStore = createPhoneStatusStore();

// Setup socket listeners
if (browser) {
  socketStore.subscribe((socket) => {
    if (socket) {
      socket.on('status_update', (status: DeviceStatus) => {
        statusStore.set(status);
      });

      socket.on('phone_status', (status: PhoneStatus) => {
        phoneStatusStore.set(status);
      });
    }
  });
}
