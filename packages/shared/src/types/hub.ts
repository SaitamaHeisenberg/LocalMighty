export interface HubText {
  id: string;
  content: string;
  authorIp: string;
  updatedAt: number;
}

export interface HubTextUpdatePayload {
  content: string;
}

// Hub - File upload
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

export type HubFileRetention = '1h' | '24h' | '7d' | 'unlimited';

// Hub - Text history
export interface HubTextHistoryEntry {
  id: string;
  content: string;
  authorIp: string;
  createdAt: number;
}

// Hub - Password vault
export interface HubVaultEntry {
  id: string;
  label: string;
  username: string;
  passwordEncrypted: string;
  totpSecretEncrypted: string;
  url: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface HubVaultMeta {
  isSetup: boolean;
  salt: string | null;
  verificationBlob: string | null;
}
