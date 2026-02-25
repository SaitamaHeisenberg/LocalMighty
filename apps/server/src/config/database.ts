import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'localmighty.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      address TEXT NOT NULL,
      body TEXT,
      date INTEGER NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      synced_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL,
      app_name TEXT,
      title TEXT,
      text TEXT,
      timestamp INTEGER NOT NULL,
      dismissed INTEGER DEFAULT 0,
      synced_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS device_status (
      id INTEGER PRIMARY KEY DEFAULT 1,
      battery_level INTEGER,
      is_charging INTEGER,
      wifi_connected INTEGER,
      last_seen INTEGER
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      device_name TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      last_used INTEGER
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      synced_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS contact_phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      contact_name TEXT,
      type TEXT NOT NULL,
      date INTEGER NOT NULL,
      duration INTEGER DEFAULT 0,
      synced_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(date DESC);
    CREATE INDEX IF NOT EXISTS idx_calls_number ON calls(number);
    CREATE INDEX IF NOT EXISTS idx_contact_phones_number ON contact_phones(phone_number);
    CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_address ON messages(address);
    CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_package ON notifications(package_name);
  `);

  // Initialize device status row
  const existing = db.prepare('SELECT id FROM device_status WHERE id = 1').get();
  if (!existing) {
    db.prepare('INSERT INTO device_status (id, battery_level, is_charging, wifi_connected, last_seen) VALUES (1, 0, 0, 0, 0)').run();
  }

  console.log('Database initialized at:', DB_PATH);
}

export function closeDatabase() {
  db.close();
}
