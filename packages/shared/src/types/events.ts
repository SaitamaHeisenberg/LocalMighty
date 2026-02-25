import type { SmsMessage, SendSmsPayload } from './sms.js';
import type { AppNotification, DismissNotificationPayload } from './notification.js';
import type { DeviceStatus, PhoneInfo } from './status.js';

// Phone -> Server events
export interface PhoneToServerEvents {
  new_sms: (data: SmsMessage) => void;
  sms_batch: (data: SmsMessage[]) => void;
  new_notif: (data: AppNotification) => void;
  notif_batch: (data: AppNotification[]) => void;
  battery_update: (data: DeviceStatus) => void;
  phone_connected: (data: PhoneInfo) => void;
  phone_disconnected: () => void;
  notif_dismissed_phone: (data: DismissNotificationPayload) => void;
}

// Server -> Phone events
export interface ServerToPhoneEvents {
  send_sms: (data: SendSmsPayload) => void;
  dismiss_notif: (data: DismissNotificationPayload) => void;
  request_sync: () => void;
}

// Server -> Web events
export interface ServerToWebEvents {
  update_sms: (data: SmsMessage) => void;
  update_notifications: (data: AppNotification) => void;
  status_update: (data: DeviceStatus) => void;
  phone_status: (data: { connected: boolean; info?: PhoneInfo }) => void;
  sms_sync_complete: (data: { count: number }) => void;
}

// Web -> Server events
export interface WebToServerEvents {
  send_sms: (data: SendSmsPayload) => void;
  dismiss_notif: (data: DismissNotificationPayload) => void;
  join: (room: string) => void;
}
