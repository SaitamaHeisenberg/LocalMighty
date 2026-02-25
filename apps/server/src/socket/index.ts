import { Server as SocketIOServer, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@localmighty/shared';
import { validateSocketToken } from '../middleware/auth.js';
import { setupSmsHandlers } from './handlers/sms.js';
import { setupNotificationHandlers } from './handlers/notification.js';
import { setupStatusHandlers } from './handlers/status.js';
import { setupContactsHandlers } from './handlers/contacts.js';

interface PhoneState {
  connected: boolean;
  socketId: string | null;
  deviceName: string | null;
  lastSeen: number;
}

const phoneState: PhoneState = {
  connected: false,
  socketId: null,
  deviceName: null,
  lastSeen: 0,
};

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    // Allow connection without token for initial pairing
    if (!token) {
      return next();
    }

    if (validateSocketToken(token)) {
      return next();
    }

    return next(new Error('Authentication failed'));
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle room joining
    socket.on(SOCKET_EVENTS.JOIN, (room: string) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);

      // Send current phone status to web clients
      if (room === 'web-clients') {
        socket.emit(SOCKET_EVENTS.PHONE_STATUS, {
          connected: phoneState.connected,
          deviceName: phoneState.deviceName,
        });
      }
    });

    // Handle phone connection
    socket.on(SOCKET_EVENTS.PHONE_CONNECTED, (data: { deviceName: string }) => {
      phoneState.connected = true;
      phoneState.socketId = socket.id;
      phoneState.deviceName = data.deviceName;
      phoneState.lastSeen = Date.now();

      socket.join('phone');
      console.log(`Phone connected: ${data.deviceName}`);

      // Notify web clients
      io.to('web-clients').emit(SOCKET_EVENTS.PHONE_STATUS, {
        connected: true,
        deviceName: data.deviceName,
      });
    });

    // Setup handlers
    setupSmsHandlers(socket, io);
    setupNotificationHandlers(socket, io);
    setupStatusHandlers(socket, io);
    setupContactsHandlers(socket, io);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

      if (phoneState.socketId === socket.id) {
        phoneState.connected = false;
        phoneState.socketId = null;

        // Notify web clients
        io.to('web-clients').emit(SOCKET_EVENTS.PHONE_STATUS, {
          connected: false,
        });

        console.log('Phone disconnected');
      }
    });
  });

  console.log('Socket.io handlers initialized');
}

export function getPhoneState(): PhoneState {
  return { ...phoneState };
}
