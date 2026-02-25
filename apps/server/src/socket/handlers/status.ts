import { Socket, Server } from 'socket.io';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { DeviceStatus } from '@localmighty/shared';

export function setupStatusHandlers(socket: Socket, io: Server) {
  // Handle battery/status update from phone
  socket.on(SOCKET_EVENTS.BATTERY_UPDATE, (data: DeviceStatus) => {
    // Update database
    db.prepare(`
      UPDATE device_status
      SET battery_level = ?, is_charging = ?, wifi_connected = ?, last_seen = ?
      WHERE id = 1
    `).run(
      data.batteryLevel,
      data.isCharging ? 1 : 0,
      data.wifiConnected ? 1 : 0,
      Date.now()
    );

    // Broadcast to web clients
    io.to('web-clients').emit(SOCKET_EVENTS.STATUS_UPDATE, data);
  });

  // Handle request sync (from web to phone)
  socket.on(SOCKET_EVENTS.REQUEST_SYNC, () => {
    console.log('Sync requested from web client');

    // Forward to phone
    io.to('phone').emit(SOCKET_EVENTS.REQUEST_SYNC);
  });
}

// Get current device status from database
export function getDeviceStatus(): DeviceStatus | null {
  const status = db.prepare(`
    SELECT
      battery_level as batteryLevel,
      is_charging as isCharging,
      wifi_connected as wifiConnected,
      last_seen as lastSeen
    FROM device_status
    WHERE id = 1
  `).get() as {
    batteryLevel: number;
    isCharging: number;
    wifiConnected: number;
    lastSeen: number;
  } | undefined;

  if (!status) return null;

  return {
    batteryLevel: status.batteryLevel,
    isCharging: status.isCharging === 1,
    wifiConnected: status.wifiConnected === 1,
    lastSeen: status.lastSeen,
  };
}
