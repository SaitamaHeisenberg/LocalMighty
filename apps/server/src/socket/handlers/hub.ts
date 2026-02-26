import { Namespace, Socket } from 'socket.io';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { HubText, HubTextUpdatePayload } from '@localmighty/shared';

function getClientIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return socket.handshake.address;
}

function getClipboard(): HubText {
  const row = db.prepare('SELECT content, author_ip, updated_at FROM hub_clipboard WHERE id = 1').get() as
    { content: string; author_ip: string; updated_at: number } | undefined;

  return {
    id: '1',
    content: row?.content ?? '',
    authorIp: row?.author_ip ?? '',
    updatedAt: row?.updated_at ?? 0,
  };
}

function updateClipboard(content: string, authorIp: string): HubText {
  const now = Date.now();
  db.prepare('UPDATE hub_clipboard SET content = ?, author_ip = ?, updated_at = ? WHERE id = 1')
    .run(content, authorIp, now);

  return { id: '1', content, authorIp, updatedAt: now };
}

export function setupHubHandlers(shareNs: Namespace) {
  shareNs.on('connection', (socket: Socket) => {
    const ip = getClientIp(socket);
    console.log(`[HUB] Client connected: ${socket.id} (${ip})`);

    // Client requests current clipboard content
    socket.on(SOCKET_EVENTS.HUB_TEXT_REQUEST, () => {
      const clipboard = getClipboard();
      socket.emit(SOCKET_EVENTS.HUB_TEXT_SYNC, clipboard);
    });

    // Client sends a text update
    socket.on(SOCKET_EVENTS.HUB_TEXT_UPDATE, (payload: HubTextUpdatePayload) => {
      const content = payload.content ?? '';

      // Enforce 10 Ko limit server-side
      if (Buffer.byteLength(content, 'utf8') > 10240) {
        return;
      }

      const clipboard = updateClipboard(content, ip);
      console.log(`[HUB] Text updated by ${ip} (${content.length} chars)`);

      // Broadcast to all OTHER clients in the namespace
      socket.broadcast.emit(SOCKET_EVENTS.HUB_TEXT_SYNC, clipboard);
    });

    socket.on('disconnect', () => {
      console.log(`[HUB] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[HUB] Share namespace handlers initialized');
}

// Export for REST route usage
export { getClipboard, updateClipboard };
