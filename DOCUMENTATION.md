# LocalMighty - Documentation Complete

## Table des matieres

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Fonctionnalites implementees](#fonctionnalites-implementees)
4. [Fonctionnalites manquantes](#fonctionnalites-manquantes)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [Socket Events](#socket-events)
9. [Base de donnees](#base-de-donnees)
10. [Securite](#securite)
11. [Roadmap](#roadmap)

---

## Vue d'ensemble

**LocalMighty** est une application de synchronisation SMS, appels et notifications entre un telephone Android et un PC, fonctionnant exclusivement sur le reseau local (Wi-Fi).

### Caracteristiques principales

- Synchronisation SMS en temps reel (< 5 secondes)
- Historique des appels avec appel depuis PC
- Mirroring des notifications avec reponses directes
- Gestion des contacts complete
- Interface moderne avec themes et mode compact
- 100% local, pas d'internet requis
- Open source

### Stack technique

| Composant | Technologies |
|-----------|--------------|
| Android | Kotlin, Jetpack Compose, Socket.io-client 2.1.0 |
| Serveur | Node.js, Express, Socket.io 4.7, SQLite (better-sqlite3) |
| Web | SvelteKit 2.5, Tailwind CSS 3.4, Socket.io-client 4.7 |
| Partage | TypeScript 5.3 (types + constantes) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Reseau Local Wi-Fi                     │
│                                                             │
│   ┌─────────────┐         ┌─────────────┐                   │
│   │   Android   │◄───────►│   Serveur   │◄────────┐         │
│   │     App     │ Socket  │   Node.js   │ Socket  │         │
│   │             │   io    │  Port 3001  │   io    │         │
│   └─────────────┘         └──────┬──────┘         │         │
│                                  │                │         │
│                                  │ REST API       │         │
│                                  │                │         │
│                           ┌──────▼──────┐  ┌──────▼──────┐   │
│                           │   SQLite    │  │  Dashboard  │   │
│                           │   Database  │  │    Web      │   │
│                           └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Structure du projet

```
LocalMighty/
├── apps/
│   ├── android/           # Application Android
│   │   └── app/src/main/kotlin/com/localmighty/
│   │       ├── network/           # SocketManager (WebSocket client)
│   │       ├── services/          # ForegroundService, NotificationListener
│   │       ├── observers/         # SmsContentObserver, BatteryReceiver
│   │       ├── helpers/           # ContactsHelper
│   │       ├── utils/             # SmsReader, CallLogReader, PermissionHelper
│   │       ├── data/              # AppPreferences (DataStore)
│   │       └── ui/                # MainScreen (Compose)
│   │
│   ├── server/            # Backend Node.js
│   │   └── src/
│   │       ├── config/            # database.ts (SQLite schema)
│   │       ├── routes/            # auth, messages, contacts, calls, notifications
│   │       ├── socket/handlers/   # sms, notification, status, contacts, calls
│   │       ├── middleware/        # auth.ts (token validation)
│   │       └── services/          # mdns.ts (Bonjour discovery)
│   │
│   └── web/               # Dashboard SvelteKit
│       └── src/
│           ├── routes/            # Pages (/, /sms, /calls, /contacts, /notifications, /settings)
│           ├── lib/stores/        # socket, messages, contacts, calls, notifications, theme, chatLayout
│           ├── lib/components/    # sms/, layout/, notifications/, ui/
│           ├── lib/services/      # desktopNotifications, smsTemplates, offlineCache
│           └── lib/utils/         # formatters
│
└── packages/
    └── shared/            # Types TypeScript partages
        └── src/
            ├── types/             # sms, call, notification, status, events
            └── constants/         # socket-events.ts (29 events)
```

---

## Fonctionnalites implementees

### Android App

| Fonctionnalite | Status | Description |
|----------------|--------|-------------|
| Connexion Socket.io | ✅ | WebSocket avec reconnexion auto (backoff exponentiel) |
| Sync SMS | ✅ | Batch initial + temps reel via ContentObserver |
| Envoi SMS | ✅ | Reception des commandes, suivi sent/delivered/failed |
| Sync contacts | ✅ | Liste complete avec numeros normalises |
| Sync appels | ✅ | Historique complet (incoming/outgoing/missed/rejected/voicemail) |
| Appel depuis PC | ✅ | Ouverture du dialer Android |
| Notifications | ✅ | Capture via NotificationListenerService |
| Reponse notifs | ✅ | RemoteInput pour repondre directement |
| Batterie | ✅ | Niveau + etat de charge (heartbeat 30s) |
| Service foreground | ✅ | WakeLock + notification persistante |
| UI reconnexion | ✅ | Animation + compteur tentatives |
| Gestion permissions | ✅ | UI pour autoriser toutes les permissions |
| HyperOS/Xiaomi | ✅ | Guide autostart + batterie |

### Serveur Node.js

| Fonctionnalite | Status | Description |
|----------------|--------|-------------|
| REST API | ✅ | 5 groupes de routes (auth, messages, contacts, calls, notifications) |
| Socket.io | ✅ | Rooms (phone, web-clients), relay bidirectionnel |
| SQLite WAL | ✅ | 7 tables avec index optimises |
| mDNS | ✅ | Bonjour advertisement `_localmighty._tcp` |
| Auth token | ✅ | Pairing UUID + validation + last_used |
| Threads SMS | ✅ | Groupement par conversation + unread count |
| Recherche | ✅ | Full-text sur SMS (body, contact name) |
| Stats | ✅ | Compteurs messages, appels, contacts |
| Suppression | ✅ | DELETE thread avec cascade messages |
| Serve Web | ✅ | SvelteKit build servi depuis /web-build |

### Dashboard Web

| Fonctionnalite | Status | Description |
|----------------|--------|-------------|
| Dashboard | ✅ | Vue d'ensemble avec stats et status |
| Conversations | ✅ | Liste threads + detail messages |
| Layout moderne | ✅ | Chat bubbles style messaging app |
| Layout classique | ✅ | Vue liste traditionnelle |
| Mode compact | ✅ | Espacement reduit pour plus de contenu |
| Envoi SMS | ✅ | Composition + templates rapides |
| Envoi en masse | ✅ | Bulk SMS a plusieurs destinataires |
| Statut livraison | ✅ | Indicateurs sending/sent/delivered/failed |
| Historique appels | ✅ | Liste filtrable par type |
| Appel depuis PC | ✅ | Bouton dial → ouvre dialer Android |
| Contacts | ✅ | Liste + recherche intelligente multi-mots |
| Notifications | ✅ | Liste par app + dismiss |
| Batterie | ✅ | Niveau + indicateur charge |
| Status connexion | ✅ | Serveur + telephone en temps reel |
| Cache contacts | ✅ | LocalStorage 24h + refresh background |
| Notifications desktop | ✅ | Browser notifications API |
| Theme sombre | ✅ | Light/Dark/System |
| Recherche globale | ✅ | Dans tous les SMS |
| Suppression conv | ✅ | Delete thread depuis UI |

---

## Fonctionnalites manquantes

### Haute priorite

| Fonctionnalite | Effort | Description |
|----------------|--------|-------------|
| Multi-utilisateurs | Eleve | Authentification JWT, isolation donnees |
| Validation input | Moyen | Securiser les entrees API |
| Rate limiting | Faible | Proteger contre le spam |

### Moyenne priorite

| Fonctionnalite | Effort | Description |
|----------------|--------|-------------|
| Export donnees | Moyen | Backup SMS/contacts en JSON/CSV |
| Photos contacts | Moyen | Avatars dans l'UI |
| Mode hors-ligne | Eleve | Queue des messages, IndexedDB |
| Multi-langue | Moyen | i18n francais/anglais |

### Basse priorite

| Fonctionnalite | Effort | Description |
|----------------|--------|-------------|
| Chiffrement E2E | Eleve | Securite des messages |
| MMS/Images | Eleve | Pieces jointes |
| Reactions | Moyen | Emojis sur messages |

---

## Installation

### Prerequis

- Node.js 18+
- pnpm 8+
- Android Studio (pour l'APK)
- Android 8.0+ (API 26) sur le telephone

### Serveur + Dashboard

```bash
# Cloner le projet
git clone https://github.com/SaitamaHeisenberg/LocalMighty.git
cd LocalMighty

# Installer les dependances
pnpm install

# Lancer en developpement
pnpm dev

# Ou lancer separement
pnpm --filter @localmighty/server dev   # Serveur: http://localhost:3001
pnpm --filter @localmighty/web dev      # Web: http://localhost:5173
```

### Application Android

```powershell
# Build APK
powershell -NoProfile -ExecutionPolicy Bypass -File "apps/android/build_apk.ps1"

# Installer sur telephone connecte
adb install -r "apps/android/app/build/outputs/apk/debug/app-debug.apk"
```

### Configuration Xiaomi/HyperOS

1. **Parametres > Apps > LocalMighty**
2. Activer "Demarrage automatique"
3. Desactiver "Optimisation batterie"
4. Autoriser "Activite en arriere-plan"
5. Verrouiller l'app dans les recents

---

## Configuration

### Variables d'environnement (serveur)

```env
# apps/server/.env
PORT=3001
HOST=0.0.0.0
```

### Android

Dans l'application, saisir :
- **Adresse IP** : IP locale du PC (ex: 192.168.1.100)
- **Port** : 3001 (par defaut)

### Deploiement Production

```bash
# Build + deploy sur serveur Proxmox/LXC
pnpm --filter @localmighty/web build && \
scp -r apps/web/build root@172.10.10.50:/opt/localmighty/apps/web/ && \
ssh root@172.10.10.50 "rm -rf /opt/localmighty/apps/server/web-build && \
cp -r /opt/localmighty/apps/web/build /opt/localmighty/apps/server/web-build && \
pm2 restart all"
```

---

## API Reference

### Authentification

#### POST /api/auth/pair
Genere un token de pairing.

```json
// Request
{ "deviceName": "Redmi Note 13 Pro" }

// Response
{ "token": "550e8400-e29b-41d4-a716-446655440000" }
```

#### POST /api/auth/validate
Verifie un token.

```json
// Request
{ "token": "550e8400-..." }

// Response
{ "valid": true, "deviceName": "Redmi Note 13 Pro" }
```

#### DELETE /api/auth/revoke
Revoque un token (Bearer token requis).

#### GET /api/auth/devices
Liste tous les appareils paires.

### Messages SMS

#### GET /api/messages/threads
Liste des conversations.

```json
// Response
[
  {
    "thread_id": "123",
    "address": "+33612345678",
    "contact_name": "John Doe",
    "last_message": "Salut !",
    "last_date": 1708876800000,
    "unread_count": 2,
    "message_count": 45
  }
]
```

#### GET /api/messages/thread/:threadId
Messages d'une conversation (pagine avec `before` et `limit`).

```json
// Response
[
  {
    "id": "1",
    "thread_id": "123",
    "address": "+33612345678",
    "body": "Salut !",
    "date": 1708876800000,
    "type": "inbox",
    "read": 1
  }
]
```

#### GET /api/messages/search?q=query
Recherche dans les SMS (min 2 caracteres).

#### POST /api/messages/thread/:threadId/read
Marque un thread comme lu.

#### DELETE /api/messages/thread/:threadId
Supprime une conversation et tous ses messages.

#### GET /api/messages/stats
Statistiques (total, today, this_week).

### Contacts

#### GET /api/contacts
Liste des contacts avec numeros.

```json
[
  {
    "id": "1",
    "name": "John Doe",
    "phoneNumbers": ["+33612345678", "+33698765432"]
  }
]
```

#### GET /api/contacts/search?q=query
Recherche de contacts (min 2 caracteres, limit 20).

#### GET /api/contacts/by-phone/:phoneNumber
Trouve un contact par numero (match sur 9 derniers chiffres).

#### GET /api/contacts/stats
Statistiques (total contacts, total phones).

### Appels

#### GET /api/calls
Liste des appels (pagine avec `offset` et `limit`).

```json
[
  {
    "id": "1",
    "number": "+33612345678",
    "contact_name": "John Doe",
    "type": "incoming",
    "date": 1708876800000,
    "duration": 125
  }
]
```

#### GET /api/calls/type/:type
Filtre par type (incoming, outgoing, missed, rejected, voicemail).

#### GET /api/calls/stats
Statistiques (total, par type, duree totale).

### Notifications

#### GET /api/notifications
Liste des notifications (query `dismissed` pour inclure dismissed).

#### GET /api/notifications/apps
Liste des apps avec nombre de notifications.

#### GET /api/notifications/app/:packageName
Notifications d'une app specifique.

#### POST /api/notifications/:id/dismiss
Rejette une notification.

#### POST /api/notifications/dismiss-all
Rejette toutes les notifications.

#### DELETE /api/notifications/cleanup
Supprime les notifications > 7 jours dismissees.

---

## Socket Events

### Phone → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `phone_connected` | `{deviceName, model, androidVersion}` | Telephone connecte |
| `new_sms` | `SmsMessage` | Nouveau SMS recu |
| `sms_batch` | `SmsMessage[]` | Batch de SMS |
| `sms_sent` | `{messageId, address}` | SMS envoye |
| `sms_delivered` | `{messageId, address}` | SMS livre |
| `sms_failed` | `{messageId, address, error}` | SMS echoue |
| `new_notif` | `AppNotification` | Nouvelle notification |
| `notif_batch` | `AppNotification[]` | Batch notifications |
| `notif_dismissed_phone` | `{id, packageName}` | Notification dismissed sur tel |
| `battery_update` | `{batteryLevel, isCharging, wifiConnected, lastSeen}` | Status batterie |
| `contacts_sync` | `Contact[]` | Sync des contacts |
| `call_log_sync` | `CallLogEntry[]` | Sync historique appels |
| `new_call` | `CallLogEntry` | Nouvel appel |

### Server → Phone

| Event | Payload | Description |
|-------|---------|-------------|
| `send_sms` | `{address, body, threadId?}` | Demande d'envoi SMS |
| `send_bulk_sms` | `{addresses[], body}` | Envoi SMS en masse |
| `dismiss_notif` | `{id, packageName}` | Rejeter notification |
| `reply_notif` | `{notificationId, message}` | Repondre a notification |
| `dial_number` | `{number}` | Appeler un numero |
| `request_sync` | - | Demande de sync complete |

### Server → Web

| Event | Payload | Description |
|-------|---------|-------------|
| `phone_status` | `{connected, info?}` | Status telephone |
| `update_sms` | `SmsMessage` | Nouveau SMS a afficher |
| `sms_sync_complete` | `{count}` | Sync SMS terminee |
| `sms_status_update` | `{messageId, status}` | Statut livraison |
| `update_notifications` | `AppNotification` | Nouvelle notification |
| `contacts_sync_complete` | `{count}` | Sync contacts terminee |
| `status_update` | `DeviceStatus` | Status batterie |
| `call_log_update` | `CallLogEntry` | Nouvel appel |
| `call_log_sync_complete` | `{count}` | Sync appels terminee |

### Web → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `"web-clients"` | Rejoindre la room web |

---

## Base de donnees

### Schema SQLite

```sql
-- Messages SMS
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  address TEXT NOT NULL,
  body TEXT,
  date INTEGER NOT NULL,
  type TEXT NOT NULL,  -- inbox, sent, draft, outbox
  read INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- Historique des appels
CREATE TABLE calls (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  contact_name TEXT,
  type TEXT NOT NULL,  -- incoming, outgoing, missed, rejected, voicemail
  date INTEGER NOT NULL,
  duration INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  app_name TEXT,
  title TEXT,
  text TEXT,
  timestamp INTEGER NOT NULL,
  dismissed INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- Status appareil
CREATE TABLE device_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  battery_level INTEGER,
  is_charging INTEGER,
  wifi_connected INTEGER,
  last_seen INTEGER
);

-- Tokens d'authentification
CREATE TABLE auth_tokens (
  token TEXT PRIMARY KEY,
  device_name TEXT,
  created_at INTEGER,
  last_used INTEGER
);

-- Contacts
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  synced_at INTEGER
);

-- Numeros de telephone
CREATE TABLE contact_phones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);
```

### Index

```sql
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_date ON messages(date DESC);
CREATE INDEX idx_messages_address ON messages(address);
CREATE INDEX idx_calls_date ON calls(date DESC);
CREATE INDEX idx_calls_number ON calls(number);
CREATE INDEX idx_contact_phones_number ON contact_phones(phone_number);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_notifications_package ON notifications(package_name);
```

---

## Securite

### Mesures actuelles

- Token UUID pour l'authentification (pas de password)
- Communication locale uniquement
- HTTP autorise uniquement sur IP privees (10.x, 172.16.x, 192.168.x)
- Validation des payloads Socket.io
- SQLite WAL mode pour la concurrence

### Recommandations production

| Mesure | Priorite | Status |
|--------|----------|--------|
| HTTPS/WSS | Haute | Non implemente |
| Rate limiting | Haute | Non implemente |
| JWT auth | Haute | Planifie (voir plan auth) |
| Input validation | Haute | Partiel |
| Logs d'audit | Moyenne | Non implemente |
| Chiffrement DB | Basse | Non implemente |

### Pour exposition internet

1. Utiliser HTTPS avec certificat Let's Encrypt
2. Ajouter Nginx en reverse proxy
3. Configurer fail2ban
4. Activer rate limiting
5. Utiliser des tokens JWT avec expiration
6. Chiffrer les donnees sensibles

---

## Roadmap

### v1.1 - Multi-utilisateurs (Planifie)
- [ ] Authentification JWT (access + refresh tokens)
- [ ] Pairing telephone avec code 6 chiffres
- [ ] Isolation donnees par utilisateur
- [ ] Pages login/register

### v1.2 - Stabilite
- [ ] Validation des inputs
- [ ] Rate limiting
- [ ] Logs serveur structures
- [ ] Gestion d'erreurs amelioree

### v1.3 - UX
- [ ] Notifications navigateur ameliorees
- [ ] Export/backup des donnees
- [ ] Photos contacts
- [ ] Multi-langue (i18n)

### v2.0 - Avance
- [ ] Mode hors-ligne avec queue
- [ ] Support MMS/images
- [ ] Chiffrement E2E
- [ ] App desktop (Electron)

---

## Contribution

1. Fork le projet
2. Creer une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

## Licence

MIT License - Voir [LICENSE](LICENSE)

---

## Support

- Issues : [GitHub Issues](https://github.com/SaitamaHeisenberg/LocalMighty/issues)
- Discussions : [GitHub Discussions](https://github.com/SaitamaHeisenberg/LocalMighty/discussions)
