import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { initializeDatabase } from './config/database.js';
import { setupSocketHandlers } from './socket/index.js';
import messagesRouter from './routes/messages.js';
import notificationsRouter from './routes/notifications.js';
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contacts.js';
import { authMiddleware } from './middleware/auth.js';
import { startMdnsAdvertisement } from './services/mdns.js';
import { getLocalIpAddress } from './utils/network.js';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Routes (no auth required for local network)
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/contacts', contactsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Server info
app.get('/api/info', (_req, res) => {
  const ip = getLocalIpAddress();
  res.json({
    name: 'LocalMighty',
    version: '1.0.0',
    ip,
    port: process.env.PORT || 3001,
  });
});

// Socket.io
setupSocketHandlers(io);

export function startServer(port: number = 3001) {
  initializeDatabase();

  const host = process.env.HOST || '0.0.0.0';

  httpServer.listen(port, host, () => {
    const ip = getLocalIpAddress();
    console.log('=========================================');
    console.log('  LocalMighty Server Started');
    console.log('=========================================');
    console.log(`  Local:   http://localhost:${port}`);
    console.log(`  Network: http://${ip}:${port}`);
    console.log('=========================================');

    startMdnsAdvertisement(port);
  });

  return { app, io, httpServer };
}
