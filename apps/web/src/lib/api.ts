import { browser } from '$app/environment';

// API server runs on port 3001, web runs on port 5173
function getApiBaseUrl(): string {
  if (!browser) return 'http://localhost:3001';
  const { hostname } = window.location;
  return `http://${hostname}:3001`;
}

export const API_BASE_URL = getApiBaseUrl();

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
