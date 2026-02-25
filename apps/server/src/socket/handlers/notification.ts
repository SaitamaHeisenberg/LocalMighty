import { Socket, Server } from 'socket.io';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';
import type { AppNotification, DismissNotificationPayload } from '@localmighty/shared';

export function setupNotificationHandlers(socket: Socket, io: Server) {
  // Handle new notification from phone
  socket.on(SOCKET_EVENTS.NEW_NOTIFICATION, (data: AppNotification) => {
    console.log(`New notification from ${data.appName}: ${data.title}`);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO notifications
      (id, package_name, app_name, title, text, timestamp, dismissed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.packageName,
      data.appName,
      data.title,
      data.text,
      data.timestamp,
      data.dismissed ? 1 : 0
    );

    // Broadcast to web clients
    io.to('web-clients').emit(SOCKET_EVENTS.UPDATE_NOTIFICATIONS, data);
  });

  // Handle batch notification sync
  socket.on(SOCKET_EVENTS.NOTIF_BATCH, (notifications: AppNotification[]) => {
    console.log(`Receiving notification batch: ${notifications.length} notifications`);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO notifications
      (id, package_name, app_name, title, text, timestamp, dismissed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((notifs: AppNotification[]) => {
      for (const notif of notifs) {
        stmt.run(
          notif.id,
          notif.packageName,
          notif.appName,
          notif.title,
          notif.text,
          notif.timestamp,
          notif.dismissed ? 1 : 0
        );
      }
    });

    insertMany(notifications);
    console.log(`Notification batch synced: ${notifications.length} notifications`);
  });

  // Handle dismiss notification request from web (forward to phone)
  socket.on(SOCKET_EVENTS.DISMISS_NOTIFICATION, (payload: DismissNotificationPayload) => {
    console.log(`Dismiss notification request: ${payload.id}`);

    // Update local database
    db.prepare('UPDATE notifications SET dismissed = 1 WHERE id = ?').run(payload.id);

    // Forward to phone
    io.to('phone').emit(SOCKET_EVENTS.DISMISS_NOTIFICATION, payload);
  });

  // Handle notification dismissed on phone
  socket.on(SOCKET_EVENTS.NOTIF_DISMISSED_PHONE, (payload: DismissNotificationPayload) => {
    console.log(`Notification dismissed on phone: ${payload.id}`);

    // Update local database
    db.prepare('UPDATE notifications SET dismissed = 1 WHERE id = ?').run(payload.id);

    // Notify web clients
    io.to('web-clients').emit(SOCKET_EVENTS.UPDATE_NOTIFICATIONS, {
      id: payload.id,
      dismissed: true,
    });
  });
}
