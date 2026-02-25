export interface SmsMessage {
  id: string;
  threadId: string;
  address: string;
  body: string;
  date: number;
  type: 'inbox' | 'sent' | 'draft' | 'outbox';
  read: boolean;
}

export interface SmsThread {
  threadId: string;
  address: string;
  contactName?: string;
  lastMessage: string;
  lastDate: number;
  unreadCount: number;
}

export interface SendSmsPayload {
  address: string;
  body: string;
  threadId?: string;
}
