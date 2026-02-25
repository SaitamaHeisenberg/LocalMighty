import { Router } from 'express';
import { db } from '../config/database.js';

const router = Router();

interface Contact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

// Get all contacts
router.get('/', (_req, res) => {
  const contactRows = db.prepare('SELECT id, name FROM contacts ORDER BY name').all() as { id: string; name: string }[];

  const contacts: Contact[] = contactRows.map(contact => {
    const phones = db.prepare('SELECT phone_number FROM contact_phones WHERE contact_id = ?')
      .all(contact.id) as { phone_number: string }[];

    return {
      id: contact.id,
      name: contact.name,
      phoneNumbers: phones.map(p => p.phone_number)
    };
  });

  res.json(contacts);
});

// Search contacts by name or phone number
router.get('/search', (req, res) => {
  const q = req.query.q as string;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  const searchTerm = `%${q}%`;

  // Search by name or phone number
  const contactIds = db.prepare(`
    SELECT DISTINCT c.id, c.name
    FROM contacts c
    LEFT JOIN contact_phones cp ON c.id = cp.contact_id
    WHERE c.name LIKE ? OR cp.phone_number LIKE ?
    ORDER BY c.name
    LIMIT 20
  `).all(searchTerm, searchTerm) as { id: string; name: string }[];

  const contacts: Contact[] = contactIds.map(contact => {
    const phones = db.prepare('SELECT phone_number FROM contact_phones WHERE contact_id = ?')
      .all(contact.id) as { phone_number: string }[];

    return {
      id: contact.id,
      name: contact.name,
      phoneNumbers: phones.map(p => p.phone_number)
    };
  });

  res.json(contacts);
});

// Get contact by phone number
router.get('/by-phone/:phoneNumber', (req, res) => {
  const { phoneNumber } = req.params;
  const normalized = phoneNumber.replace(/[^0-9+]/g, '');
  const lastDigits = normalized.slice(-9);

  const contact = db.prepare(`
    SELECT c.id, c.name
    FROM contacts c
    JOIN contact_phones cp ON c.id = cp.contact_id
    WHERE cp.phone_number LIKE ?
    LIMIT 1
  `).get(`%${lastDigits}`) as { id: string; name: string } | undefined;

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const phones = db.prepare('SELECT phone_number FROM contact_phones WHERE contact_id = ?')
    .all(contact.id) as { phone_number: string }[];

  res.json({
    id: contact.id,
    name: contact.name,
    phoneNumbers: phones.map(p => p.phone_number)
  });
});

// Get contacts count
router.get('/stats', (_req, res) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM contacts) as totalContacts,
      (SELECT COUNT(*) FROM contact_phones) as totalPhoneNumbers
  `).get();

  res.json(stats);
});

export default router;
