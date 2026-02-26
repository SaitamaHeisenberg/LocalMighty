import { Namespace, Socket } from 'socket.io';
import crypto from 'crypto';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { HubText, HubTextUpdatePayload, HubTextHistoryEntry } from '@localmighty/shared';

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

  // Save to history if content is non-empty and different from last entry
  if (content.length > 0) {
    const lastEntry = db.prepare(
      'SELECT content FROM hub_text_history ORDER BY created_at DESC LIMIT 1'
    ).get() as { content: string } | undefined;

    if (!lastEntry || lastEntry.content !== content) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO hub_text_history (id, content, author_ip, created_at) VALUES (?, ?, ?, ?)')
        .run(id, content, authorIp, now);

      // Keep only last 10 entries
      db.prepare(
        'DELETE FROM hub_text_history WHERE id NOT IN (SELECT id FROM hub_text_history ORDER BY created_at DESC LIMIT 10)'
      ).run();
    }
  }

  db.prepare('UPDATE hub_clipboard SET content = ?, author_ip = ?, updated_at = ? WHERE id = 1')
    .run(content, authorIp, now);

  return { id: '1', content, authorIp, updatedAt: now };
}

function getTextHistory(): HubTextHistoryEntry[] {
  const rows = db.prepare(
    'SELECT id, content, author_ip, created_at FROM hub_text_history ORDER BY created_at DESC LIMIT 10'
  ).all() as { id: string; content: string; author_ip: string; created_at: number }[];

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    authorIp: row.author_ip,
    createdAt: row.created_at,
  }));
}

function clearTextHistory(): void {
  db.prepare('DELETE FROM hub_text_history').run();
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
export { getClipboard, updateClipboard, getTextHistory, clearTextHistory };
