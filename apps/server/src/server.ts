import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeDatabase } from './config/database.js';
import { setupSocketHandlers } from './socket/index.js';
import messagesRouter from './routes/messages.js';
import notificationsRouter from './routes/notifications.js';
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contacts.js';
import callsRouter from './routes/calls.js';
import { authMiddleware } from './middleware/auth.js';
import { startMdnsAdvertisement } from './services/mdns.js';
import { getLocalIpAddress } from './utils/network.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS - allow all origins in production for local network access
const corsOrigins = process.env.NODE_ENV === 'production'
  ? true  // Allow all origins in production (local network)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Routes (no auth required for local network)
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/calls', callsRouter);

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

// Load SvelteKit handler
async function loadSvelteKitHandler() {
  const webBuildPath = path.resolve(__dirname, '../web-build');

  if (fs.existsSync(webBuildPath)) {
    try {
      // Serve static client files
      app.use(express.static(path.join(webBuildPath, 'client')));

      // Import and use SvelteKit handler for SSR
      const handlerPath = path.join(webBuildPath, 'handler.js');
      const { handler } = await import(`file://${handlerPath.replace(/\\/g, '/')}`);
      app.use(handler);
      console.log('SvelteKit app loaded successfully');
    } catch (err) {
      console.error('Failed to load SvelteKit handler:', err);
    }
  } else {
    console.log('No web-build found at:', webBuildPath);
    console.log('Serving API only');
  }
}

export async function startServer(port: number = 3001) {
  initializeDatabase();

  // Load SvelteKit handler before starting server
  await loadSvelteKitHandler();

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
