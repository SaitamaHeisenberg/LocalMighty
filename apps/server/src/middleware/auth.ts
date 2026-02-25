import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  const validToken = db.prepare('SELECT token FROM auth_tokens WHERE token = ?').get(token);

  if (!validToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Update last used
  db.prepare('UPDATE auth_tokens SET last_used = ? WHERE token = ?').run(Date.now(), token);

  next();
}

export function validateSocketToken(token: string): boolean {
  if (!token) return false;

  const validToken = db.prepare('SELECT token FROM auth_tokens WHERE token = ?').get(token);

  if (validToken) {
    db.prepare('UPDATE auth_tokens SET last_used = ? WHERE token = ?').run(Date.now(), token);
    return true;
  }

  return false;
}
