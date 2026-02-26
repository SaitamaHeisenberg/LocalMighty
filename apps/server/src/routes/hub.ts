import { Router } from 'express';
import { getClipboard, updateClipboard } from '../socket/handlers/hub.js';

const router = Router();

// Get current clipboard text
router.get('/text', (_req, res) => {
  const clipboard = getClipboard();
  res.json(clipboard);
});

// Update clipboard text
router.put('/text', (req, res) => {
  const { content } = req.body;

  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' });
  }

  // 10 Ko limit
  if (Buffer.byteLength(content, 'utf8') > 10240) {
    return res.status(413).json({ error: 'Content exceeds 10 Ko limit' });
  }

  const ip = req.ip || req.socket.remoteAddress || '';
  const clipboard = updateClipboard(content, ip);
  res.json(clipboard);
});

export default router;
