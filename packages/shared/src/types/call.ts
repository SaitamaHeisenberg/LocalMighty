export type CallType = 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'voicemail';

export interface CallLogEntry {
  id: string;
  number: string;
  contactName?: string;
  type: CallType;
  date: number;
  duration: number; // in seconds
}

export interface DialPayload {
  number: string;
}
