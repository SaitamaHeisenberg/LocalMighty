export interface AppNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  timestamp: number;
  dismissed: boolean;
  icon?: string;
}

export interface DismissNotificationPayload {
  id: string;
  packageName: string;
}
