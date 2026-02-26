import fs from 'fs';
import path from 'path';
import { db } from '../config/database.js';
import { UPLOADS_DIR } from '../routes/hub.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { Namespace } from 'socket.io';

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function startHubCleanup(shareNs: Namespace) {
  function cleanup() {
    const now = Date.now();
    const expired = db.prepare(
      'SELECT id, stored_name, original_name FROM hub_files WHERE expires_at IS NOT NULL AND expires_at < ?'
    ).all(now) as { id: string; stored_name: string; original_name: string }[];

    if (expired.length === 0) return;

    for (const file of expired) {
      // Delete from disk
      const filePath = path.join(UPLOADS_DIR, file.stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Broadcast deletion
      shareNs.emit(SOCKET_EVENTS.HUB_FILE_DELETED, { id: file.id });
    }

    // Delete all expired from DB in one query
    const ids = expired.map((f) => f.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM hub_files WHERE id IN (${placeholders})`).run(...ids);

    console.log(`[HUB] Cleanup: removed ${expired.length} expired file(s)`);
  }

  // Run immediately on start, then every 5 min
  cleanup();
  setInterval(cleanup, CLEANUP_INTERVAL);

  console.log('[HUB] File cleanup timer started (every 5 min)');
}
