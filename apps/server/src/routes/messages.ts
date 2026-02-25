import { Router } from 'express';
import { db } from '../config/database.js';

const router = Router();

// Helper to find contact name by phone number
function findContactName(phoneNumber: string): string | null {
  const normalized = phoneNumber.replace(/[^0-9+]/g, '');
  const lastDigits = normalized.slice(-9);

  const result = db.prepare(`
    SELECT c.name FROM contacts c
    JOIN contact_phones cp ON c.id = cp.contact_id
    WHERE cp.phone_number LIKE ?
    LIMIT 1
  `).get(`%${lastDigits}`) as { name: string } | undefined;

  return result?.name || null;
}

// Get all threads (conversations)
router.get('/threads', (_req, res) => {
  const threads = db.prepare(`
    SELECT
      thread_id as threadId,
      address,
      body as lastMessage,
      MAX(date) as lastDate,
      SUM(CASE WHEN read = 0 AND type = 'inbox' THEN 1 ELSE 0 END) as unreadCount
    FROM messages
    GROUP BY thread_id
    ORDER BY lastDate DESC
  `).all() as { threadId: string; address: string; lastMessage: string; lastDate: number; unreadCount: number }[];

  // Add contact names
  const threadsWithNames = threads.map(thread => ({
    ...thread,
    contactName: findContactName(thread.address)
  }));

  res.json(threadsWithNames);
});

// Get messages by thread
router.get('/thread/:threadId', (req, res) => {
  const { threadId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before ? parseInt(req.query.before as string) : null;

  let query = `
    SELECT
      id,
      thread_id as threadId,
      address,
      body,
      date,
      type,
      read
    FROM messages
    WHERE thread_id = ?
  `;
  const params: (string | number)[] = [threadId];

  if (before) {
    query += ' AND date < ?';
    params.push(before);
  }

  query += ' ORDER BY date DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(query).all(...params);
  res.json(messages.reverse()); // Return in chronological order
});

// Search messages (must be before /:id to avoid conflict)
router.get('/search', (req, res) => {
  const q = req.query.q as string;
  const limit = parseInt(req.query.limit as string) || 50;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  // Search in message body AND contact names
  const messages = db.prepare(`
    SELECT DISTINCT
      m.id,
      m.thread_id as threadId,
      m.address,
      m.body,
      m.date,
      m.type,
      m.read
    FROM messages m
    LEFT JOIN contact_phones cp ON m.address LIKE '%' || SUBSTR(cp.phone_number, -9)
    LEFT JOIN contacts c ON cp.contact_id = c.id
    WHERE m.body LIKE ? OR c.name LIKE ? OR m.address LIKE ?
    ORDER BY m.date DESC
    LIMIT ?
  `).all(`%${q}%`, `%${q}%`, `%${q}%`, limit) as { id: string; threadId: string; address: string; body: string; date: number; type: string; read: number }[];

  // Add contact names and highlight info
  const messagesWithNames = messages.map(msg => ({
    ...msg,
    contactName: findContactName(msg.address)
  }));

  res.json(messagesWithNames);
});

// Get single message
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const message = db.prepare(`
    SELECT
      id,
      thread_id as threadId,
      address,
      body,
      date,
      type,
      read
    FROM messages
    WHERE id = ?
  `).get(id);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  res.json(message);
});

// Mark thread as read
router.post('/thread/:threadId/read', (req, res) => {
  const { threadId } = req.params;

  db.prepare('UPDATE messages SET read = 1 WHERE thread_id = ? AND read = 0').run(threadId);

  res.json({ success: true });
});

// Get stats
router.get('/stats', (_req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as totalMessages,
      COUNT(DISTINCT thread_id) as totalThreads,
      SUM(CASE WHEN read = 0 AND type = 'inbox' THEN 1 ELSE 0 END) as unreadCount
    FROM messages
  `).get();

  res.json(stats);
});

export default router;
