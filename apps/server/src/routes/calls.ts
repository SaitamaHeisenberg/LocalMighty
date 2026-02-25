import { Router } from 'express';
import { getCalls, getCallsByType, getCallStats } from '../socket/handlers/calls.js';

const router = Router();

// Get all calls
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const calls = getCalls(limit, offset);
  res.json(calls);
});

// Get calls by type
router.get('/type/:type', (req, res) => {
  const { type } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  if (!['incoming', 'outgoing', 'missed', 'rejected', 'voicemail'].includes(type)) {
    return res.status(400).json({ error: 'Invalid call type' });
  }

  const calls = getCallsByType(type, limit);
  res.json(calls);
});

// Get call statistics
router.get('/stats', (_req, res) => {
  const stats = getCallStats();
  res.json(stats);
});

export default router;
