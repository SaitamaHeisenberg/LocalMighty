import { Socket, Server } from 'socket.io';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { SmsMessage, SendSmsPayload } from '@localmighty/shared';

export function setupSmsHandlers(socket: Socket, io: Server) {
  // Handle new SMS from phone
  socket.on(SOCKET_EVENTS.NEW_SMS, (data: SmsMessage) => {
    console.log(`New SMS from ${data.address}: ${data.body?.substring(0, 50)}...`);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO messages
      (id, thread_id, address, body, date, type, read)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.threadId,
      data.address,
      data.body,
      data.date,
      data.type,
      data.read ? 1 : 0
    );

    // Broadcast to web clients
    io.to('web-clients').emit(SOCKET_EVENTS.UPDATE_SMS, data);
  });

  // Handle batch SMS sync
  socket.on(SOCKET_EVENTS.SMS_BATCH, (messages: SmsMessage[]) => {
    console.log(`Receiving SMS batch: ${messages.length} messages`);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO messages
      (id, thread_id, address, body, date, type, read)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((msgs: SmsMessage[]) => {
      for (const msg of msgs) {
        stmt.run(
          msg.id,
          msg.threadId,
          msg.address,
          msg.body,
          msg.date,
          msg.type,
          msg.read ? 1 : 0
        );
      }
    });

    insertMany(messages);

    console.log(`SMS batch synced: ${messages.length} messages`);

    // Notify web clients
    io.to('web-clients').emit(SOCKET_EVENTS.SMS_SYNC_COMPLETE, { count: messages.length });
  });

  // Handle send SMS request from web (forward to phone)
  socket.on(SOCKET_EVENTS.SEND_SMS, (payload: SendSmsPayload) => {
    console.log(`Send SMS request to ${payload.address}: ${payload.body?.substring(0, 50)}...`);

    // Forward to phone
    io.to('phone').emit(SOCKET_EVENTS.SEND_SMS, payload);
  });

  // Handle SMS sent confirmation from phone
  socket.on(SOCKET_EVENTS.SMS_SENT, (data: { messageId: string; address: string }) => {
    console.log(`SMS sent to ${data.address} (id: ${data.messageId})`);
    io.to('web-clients').emit(SOCKET_EVENTS.SMS_STATUS_UPDATE, {
      ...data,
      status: 'sent'
    });
  });

  // Handle SMS delivered confirmation from phone
  socket.on(SOCKET_EVENTS.SMS_DELIVERED, (data: { messageId: string; address: string }) => {
    console.log(`SMS delivered to ${data.address} (id: ${data.messageId})`);
    io.to('web-clients').emit(SOCKET_EVENTS.SMS_STATUS_UPDATE, {
      ...data,
      status: 'delivered'
    });
  });

  // Handle SMS failed from phone
  socket.on(SOCKET_EVENTS.SMS_FAILED, (data: { messageId?: string; address: string; error?: string }) => {
    console.log(`SMS failed to ${data.address}: ${data.error}`);
    io.to('web-clients').emit(SOCKET_EVENTS.SMS_STATUS_UPDATE, {
      ...data,
      status: 'failed'
    });
  });
}
