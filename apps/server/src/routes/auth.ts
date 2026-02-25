import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';

const router = Router();

// Generate pairing token
router.post('/pair', (req, res) => {
  const { deviceName } = req.body;

  if (!deviceName) {
    return res.status(400).json({ error: 'Device name required' });
  }

  const token = uuidv4();

  db.prepare('INSERT INTO auth_tokens (token, device_name, last_used) VALUES (?, ?, ?)').run(
    token,
    deviceName,
    Date.now()
  );

  res.json({ token, message: 'Pairing successful' });
});

// Validate token
router.post('/validate', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const validToken = db.prepare('SELECT token, device_name, created_at FROM auth_tokens WHERE token = ?').get(token) as {
    token: string;
    device_name: string;
    created_at: number;
  } | undefined;

  if (validToken) {
    db.prepare('UPDATE auth_tokens SET last_used = ? WHERE token = ?').run(Date.now(), token);
    res.json({ valid: true, deviceName: validToken.device_name });
  } else {
    res.json({ valid: false });
  }
});

// Revoke token
router.delete('/revoke', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);

  res.json({ message: 'Token revoked' });
});

// List paired devices
router.get('/devices', (req, res) => {
  const devices = db.prepare('SELECT device_name, created_at, last_used FROM auth_tokens ORDER BY last_used DESC').all();
  res.json(devices);
});

export default router;
