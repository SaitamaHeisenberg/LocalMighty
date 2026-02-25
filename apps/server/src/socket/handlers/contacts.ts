import { Socket, Server } from 'socket.io';
import { db } from '../../config/database.js';
import { SOCKET_EVENTS } from '@localmighty/shared';

interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

export function setupContactsHandlers(socket: Socket, io: Server) {
  // Handle contacts sync from phone
  socket.on(SOCKET_EVENTS.CONTACTS_SYNC, (contacts: Contact[]) => {
    console.log(`Receiving contacts sync: ${contacts.length} contacts`);

    // Clear existing contacts
    db.exec('DELETE FROM contact_phones');
    db.exec('DELETE FROM contacts');

    const insertContact = db.prepare(`
      INSERT OR REPLACE INTO contacts (id, name, synced_at)
      VALUES (?, ?, ?)
    `);

    const insertPhone = db.prepare(`
      INSERT INTO contact_phones (contact_id, phone_number)
      VALUES (?, ?)
    `);

    const syncContacts = db.transaction((contactsList: Contact[]) => {
      const now = Date.now();
      for (const contact of contactsList) {
        insertContact.run(contact.id, contact.name, now);

        for (const phone of contact.phoneNumbers) {
          insertPhone.run(contact.id, phone);
        }
      }
    });

    syncContacts(contacts);

    console.log(`Contacts synced: ${contacts.length} contacts`);

    // Notify web clients
    io.to('web-clients').emit(SOCKET_EVENTS.CONTACTS_SYNC_COMPLETE, { count: contacts.length });
  });
}

// Helper function to find contact name by phone number
export function findContactName(phoneNumber: string): string | null {
  // Normalize the phone number (keep only digits)
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

// Get all contacts
export function getAllContacts(): Contact[] {
  const contactRows = db.prepare('SELECT id, name FROM contacts').all() as { id: string; name: string }[];

  return contactRows.map(contact => {
    const phones = db.prepare('SELECT phone_number FROM contact_phones WHERE contact_id = ?')
      .all(contact.id) as { phone_number: string }[];

    return {
      id: contact.id,
      name: contact.name,
      phoneNumbers: phones.map(p => p.phone_number)
    };
  });
}
