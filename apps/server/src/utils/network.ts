import os from 'os';

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    if (!netInterface) continue;

    for (const info of netInterface) {
      // Skip internal and non-IPv4 addresses
      if (info.internal || info.family !== 'IPv4') continue;

      // Prefer Wi-Fi or Ethernet
      if (name.toLowerCase().includes('wi-fi') ||
          name.toLowerCase().includes('wireless') ||
          name.toLowerCase().includes('ethernet') ||
          name.toLowerCase().includes('en0') ||
          name.toLowerCase().includes('eth')) {
        return info.address;
      }
    }
  }

  // Fallback: return first non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    if (!netInterface) continue;

    for (const info of netInterface) {
      if (!info.internal && info.family === 'IPv4') {
        return info.address;
      }
    }
  }

  return '127.0.0.1';
}
