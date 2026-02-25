export interface DeviceStatus {
  batteryLevel: number;
  isCharging: boolean;
  wifiConnected: boolean;
  lastSeen: number;
}

export interface PhoneInfo {
  deviceName: string;
  model: string;
  androidVersion: string;
}
