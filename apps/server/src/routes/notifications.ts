import { Router } from 'express';
import { db } from '../config/database.js';

const router = Router();

// Get all notifications
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const includeDissmissed = req.query.dismissed === 'true';

  let query = `
    SELECT
      id,
      package_name as packageName,
      app_name as appName,
      title,
      text,
      timestamp,
      dismissed
    FROM notifications
  `;

  if (!includeDissmissed) {
    query += ' WHERE dismissed = 0';
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';

  const notifications = db.prepare(query).all(limit);
  res.json(notifications);
});

// Get notifications by app
router.get('/app/:packageName', (req, res) => {
  const { packageName } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const notifications = db.prepare(`
    SELECT
      id,
      package_name as packageName,
      app_name as appName,
      title,
      text,
      timestamp,
      dismissed
    FROM notifications
    WHERE package_name = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(packageName, limit);

  res.json(notifications);
});

// Dismiss notification
router.post('/:id/dismiss', (req, res) => {
  const { id } = req.params;

  db.prepare('UPDATE notifications SET dismissed = 1 WHERE id = ?').run(id);

  res.json({ success: true });
});

// Dismiss all notifications
router.post('/dismiss-all', (_req, res) => {
  db.prepare('UPDATE notifications SET dismissed = 1 WHERE dismissed = 0').run();

  res.json({ success: true });
});

// Get unique apps with notification counts
router.get('/apps', (_req, res) => {
  const apps = db.prepare(`
    SELECT
      package_name as packageName,
      app_name as appName,
      COUNT(*) as count,
      SUM(CASE WHEN dismissed = 0 THEN 1 ELSE 0 END) as activeCount,
      MAX(timestamp) as lastNotification
    FROM notifications
    GROUP BY package_name
    ORDER BY lastNotification DESC
  `).all();

  res.json(apps);
});

// Clear old notifications (older than 7 days)
router.delete('/cleanup', (_req, res) => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const result = db.prepare('DELETE FROM notifications WHERE timestamp < ? AND dismissed = 1').run(sevenDaysAgo);

  res.json({ deleted: result.changes });
});

export default router;
