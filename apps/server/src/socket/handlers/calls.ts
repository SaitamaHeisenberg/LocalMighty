import { Socket, Server } from 'socket.io';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS, type CallLogEntry, type DialPayload } from '@localmighty/shared';

export function setupCallsHandlers(socket: Socket, io: Server) {
  // Handle call log sync from phone
  socket.on(SOCKET_EVENTS.CALL_LOG_SYNC, (calls: CallLogEntry[]) => {
    console.log(`Receiving call log sync: ${calls.length} calls`);

    const insertCall = db.prepare(`
      INSERT OR REPLACE INTO calls (id, number, contact_name, type, date, duration, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const syncCalls = db.transaction((callsList: CallLogEntry[]) => {
      const now = Date.now();
      for (const call of callsList) {
        insertCall.run(
          call.id,
          call.number,
          call.contactName || null,
          call.type,
          call.date,
          call.duration,
          now
        );
      }
    });

    syncCalls(calls);

    console.log(`Call log synced: ${calls.length} calls`);

    // Notify web clients
    io.to('web-clients').emit(SOCKET_EVENTS.CALL_LOG_SYNC_COMPLETE, { count: calls.length });
  });

  // Handle new call event from phone
  socket.on(SOCKET_EVENTS.NEW_CALL, (call: CallLogEntry) => {
    console.log(`New call: ${call.type} from ${call.number}`);

    const insertCall = db.prepare(`
      INSERT OR REPLACE INTO calls (id, number, contact_name, type, date, duration, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertCall.run(
      call.id,
      call.number,
      call.contactName || null,
      call.type,
      call.date,
      call.duration,
      Date.now()
    );

    // Broadcast to web clients
    io.to('web-clients').emit(SOCKET_EVENTS.CALL_LOG_UPDATE, call);
  });

  // Handle dial request from web (forward to phone)
  socket.on(SOCKET_EVENTS.DIAL_NUMBER, (payload: DialPayload) => {
    console.log(`[DIAL] ========================================`);
    console.log(`[DIAL] Request received from socket: ${socket.id}`);
    console.log(`[DIAL] Number to dial: ${payload.number}`);
    console.log(`[DIAL] Payload: ${JSON.stringify(payload)}`);

    // Check if phone is in the room
    const phoneRoom = io.sockets.adapter.rooms.get('phone');
    const phoneRoomMembers = phoneRoom ? Array.from(phoneRoom) : [];
    console.log(`[DIAL] Phone room has ${phoneRoom?.size || 0} clients: ${phoneRoomMembers.join(', ')}`);

    // List all rooms
    const allRooms = Array.from(io.sockets.adapter.rooms.keys());
    console.log(`[DIAL] All rooms: ${allRooms.join(', ')}`);

    // Forward to phone
    io.to('phone').emit(SOCKET_EVENTS.DIAL_NUMBER, payload);
    console.log(`[DIAL] Event forwarded to 'phone' room`);
    console.log(`[DIAL] ========================================`);
  });
}

// Get all calls with optional filters
export function getCalls(limit = 100, offset = 0): CallLogEntry[] {
  const calls = db.prepare(`
    SELECT id, number, contact_name as contactName, type, date, duration
    FROM calls
    ORDER BY date DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as CallLogEntry[];

  return calls;
}

// Get calls by type
export function getCallsByType(type: string, limit = 50): CallLogEntry[] {
  const calls = db.prepare(`
    SELECT id, number, contact_name as contactName, type, date, duration
    FROM calls
    WHERE type = ?
    ORDER BY date DESC
    LIMIT ?
  `).all(type, limit) as CallLogEntry[];

  return calls;
}

// Get call stats
export function getCallStats() {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalCalls,
      SUM(CASE WHEN type = 'incoming' THEN 1 ELSE 0 END) as incomingCalls,
      SUM(CASE WHEN type = 'outgoing' THEN 1 ELSE 0 END) as outgoingCalls,
      SUM(CASE WHEN type = 'missed' THEN 1 ELSE 0 END) as missedCalls,
      SUM(duration) as totalDuration
    FROM calls
  `).get();

  return stats;
}
