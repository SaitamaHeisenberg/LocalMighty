export interface HubText {
  id: string;
  content: string;
  authorIp: string;
  updatedAt: number;
}

export interface HubTextUpdatePayload {
  content: string;
}
