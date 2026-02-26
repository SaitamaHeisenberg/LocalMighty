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
