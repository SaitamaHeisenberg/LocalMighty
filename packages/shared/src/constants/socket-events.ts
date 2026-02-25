export const SOCKET_EVENTS = {
  // Phone -> Server
  NEW_SMS: 'new_sms',
  SMS_BATCH: 'sms_batch',
  NEW_NOTIFICATION: 'new_notif',
  NOTIF_BATCH: 'notif_batch',
  BATTERY_UPDATE: 'battery_update',
  PHONE_CONNECTED: 'phone_connected',
  PHONE_DISCONNECTED: 'phone_disconnected',
  NOTIF_DISMISSED_PHONE: 'notif_dismissed_phone',
  CONTACTS_SYNC: 'contacts_sync',
  SMS_SENT: 'sms_sent',
  SMS_DELIVERED: 'sms_delivered',
  SMS_FAILED: 'sms_failed',

  // Server -> Phone
  SEND_SMS: 'send_sms',
  DISMISS_NOTIFICATION: 'dismiss_notif',
  REQUEST_SYNC: 'request_sync',

  // Server -> Web
  UPDATE_SMS: 'update_sms',
  UPDATE_NOTIFICATIONS: 'update_notifications',
  STATUS_UPDATE: 'status_update',
  PHONE_STATUS: 'phone_status',
  SMS_SYNC_COMPLETE: 'sms_sync_complete',
  CONTACTS_SYNC_COMPLETE: 'contacts_sync_complete',
  SMS_STATUS_UPDATE: 'sms_status_update',

  // Web -> Server
  JOIN: 'join',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
