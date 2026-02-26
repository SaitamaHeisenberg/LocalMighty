import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, DATA_DIR } from '../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { HubFile } from '@localmighty/shared';
import { getClipboard, updateClipboard } from '../socket/handlers/hub.js';

const router = Router();

// Uploads directory
const UPLOADS_DIR = path.join(DATA_DIR, 'hub-uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const id = crypto.randomUUID();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${id}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo
});

// Retention duration in ms
function retentionToMs(retention: string): number | null {
  switch (retention) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return null; // unlimited
  }
}

function buildFileUrl(req: any, storedName: string): string {
  const host = req.headers.host || `localhost:3001`;
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/hub/files/${storedName}`;
}

function rowToHubFile(row: any, url: string): HubFile {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    url,
    uploaderIp: row.uploader_ip,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    retention: row.retention,
  };
}

// ===== Clipboard text (existing) =====

router.get('/text', (_req, res) => {
  const clipboard = getClipboard();
  res.json(clipboard);
});

router.put('/text', (req, res) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' });
  }
  if (Buffer.byteLength(content, 'utf8') > 10240) {
    return res.status(413).json({ error: 'Content exceeds 10 Ko limit' });
  }
  const ip = req.ip || req.socket.remoteAddress || '';
  const clipboard = updateClipboard(content, ip);
  res.json(clipboard);
});

// ===== File upload =====

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const id = req.file.filename.split('_')[0]; // uuid from filename
  const now = Date.now();
  const retention = (req.body.retention as string) || '24h';
  const durationMs = retentionToMs(retention);
  const expiresAt = durationMs ? now + durationMs : null;
  const ip = req.ip || req.socket.remoteAddress || '';

  db.prepare(`
    INSERT INTO hub_files (id, original_name, mime_type, size, stored_name, uploader_ip, created_at, expires_at, retention)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.file.originalname, req.file.mimetype, req.file.size, req.file.filename, ip, now, expiresAt, retention);

  const url = buildFileUrl(req, req.file.filename);
  const hubFile = rowToHubFile({
    id, original_name: req.file.originalname, mime_type: req.file.mimetype,
    size: req.file.size, uploader_ip: ip, created_at: now, expires_at: expiresAt, retention,
  }, url);

  // Broadcast to all hub clients
  const shareNs = req.app.locals.shareNs;
  if (shareNs) {
    shareNs.emit(SOCKET_EVENTS.HUB_FILE_NEW, hubFile);
  }

  console.log(`[HUB] File uploaded: ${req.file.originalname} (${req.file.size} bytes) by ${ip}`);
  res.json(hubFile);
});

// List files (non-expired)
router.get('/files', (req, res) => {
  const now = Date.now();
  const rows = db.prepare(
    'SELECT * FROM hub_files WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC'
  ).all(now) as any[];

  const files = rows.map((row) => rowToHubFile(row, buildFileUrl(req, row.stored_name)));
  res.json(files);
});

// Delete a file
router.delete('/files/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM hub_files WHERE id = ?').get(id) as any;

  if (!row) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Delete from disk
  const filePath = path.join(UPLOADS_DIR, row.stored_name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from DB
  db.prepare('DELETE FROM hub_files WHERE id = ?').run(id);

  // Broadcast deletion
  const shareNs = req.app.locals.shareNs;
  if (shareNs) {
    shareNs.emit(SOCKET_EVENTS.HUB_FILE_DELETED, { id });
  }

  console.log(`[HUB] File deleted: ${row.original_name}`);
  res.json({ success: true });
});

export default router;
export { UPLOADS_DIR };
