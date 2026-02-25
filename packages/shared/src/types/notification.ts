export interface AppNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  timestamp: number;
  dismissed: boolean;
  icon?: string;
  canReply?: boolean;
}

export interface DismissNotificationPayload {
  id: string;
  packageName: string;
}

export interface ReplyNotificationPayload {
  notificationId: string;
  message: string;
}
