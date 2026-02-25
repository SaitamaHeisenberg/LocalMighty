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

**LocalMighty** est une application de synchronisation SMS et notifications entre un telephone Android et un PC, fonctionnant exclusivement sur le reseau local (Wi-Fi).

### Caracteristiques principales

- Synchronisation SMS en temps reel (< 5 secondes)
- Mirroring des notifications Android
- Envoi de SMS depuis le PC
- Gestion des contacts
- 100% local, pas d'internet requis
- Open source

### Stack technique

| Composant | Technologies |
|-----------|--------------|
| Android | Kotlin, Jetpack Compose, Socket.io-client |
| Serveur | Node.js, Express, Socket.io, SQLite |
| Web | SvelteKit, Tailwind CSS, Socket.io-client |
| Partage | TypeScript (types communs) |

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
│   │       ├── network/           # Socket.io client
│   │       ├── services/          # Foreground service, Notification listener
│   │       ├── observers/         # SMS observer, Battery receiver
│   │       ├── helpers/           # Contacts helper
│   │       ├── utils/             # SMS reader, Permissions
│   │       ├── data/              # Preferences DataStore
│   │       └── ui/                # Compose UI
│   │
│   ├── server/            # Backend Node.js
│   │   └── src/
│   │       ├── config/            # Database SQLite
│   │       ├── routes/            # REST endpoints
│   │       ├── socket/            # WebSocket handlers
│   │       ├── middleware/        # Auth middleware
│   │       └── services/          # mDNS discovery
│   │
│   └── web/               # Dashboard SvelteKit
│       └── src/
│           ├── routes/            # Pages Svelte
│           ├── lib/
│           │   ├── stores/        # State management
│           │   ├── components/    # UI components
│           │   └── utils/         # Helpers
│
└── packages/
    └── shared/            # Types TypeScript partages
        └── src/
            ├── types/             # Interfaces
            └── constants/         # Socket events
```

---

## Fonctionnalites implementees

### Android App

| Fonctionnalite | Status | Description |
|----------------|--------|-------------|
| Connexion Socket.io | ✅ | Connexion WebSocket avec reconnexion auto |
| Sync SMS | ✅ | Envoi des SMS au serveur (batch + temps reel) |
| Envoi SMS | ✅ | Reception des commandes d'envoi depuis PC |
| Suivi livraison | ✅ | Confirmation sent/delivered/failed |
| Sync contacts | ✅ | Envoi de la liste des contacts |
| Notifications | ✅ | Capture et envoi des notifications |
| Batterie | ✅ | Envoi du niveau et etat de charge |
| Service foreground | ✅ | Survit en arriere-plan |
| UI reconnexion | ✅ | Indicateur anime + tentatives |
| Permissions | ✅ | Gestion des permissions Android |

### Serveur Node.js

| Fonctionnalite | Status | Description |
|----------------|--------|-------------|
| API REST | ✅ | Endpoints pour SMS, contacts, notifications |
| Socket.io | ✅ | Communication temps reel bidirectionnelle |
| SQLite | ✅ | Persistance des donnees |
| mDNS | ✅ | Decouverte automatique sur le reseau |
| Auth token | ✅ | Pairing avec token UUID |
| Threads SMS | ✅ | Groupement par conversation |
| Recherche | ✅ | Recherche dans les SMS et contacts |
| Stats | ✅ | Compteurs et statistiques |

### Dashboard Web

| Fonctionnalite | Status | Description |
|----------------|--------|-------------|
| Liste conversations | ✅ | Affichage des threads SMS |
| Detail conversation | ✅ | Historique des messages |
| Envoi SMS | ✅ | Composition et envoi |
| Liste contacts | ✅ | Avec recherche intelligente |
| Notifications | ✅ | Liste avec filtrage par app |
| Status batterie | ✅ | Niveau + indicateur charge |
| Status connexion | ✅ | Serveur + telephone |
| Cache contacts | ✅ | LocalStorage 24h |
| Toast notifications | ✅ | Feedback utilisateur |
| Mode sombre | ✅ | Theme Tailwind |
| Recherche globale | ✅ | Dans tous les SMS |

---

## Fonctionnalites manquantes

### Haute priorite

| Fonctionnalite | Effort | Description |
|----------------|--------|-------------|
| Validation input | Moyen | Securiser les entrees API |
| Rate limiting | Faible | Proteger contre le spam |
| Logs serveur | Faible | Journalisation des requetes |
| Gestion erreurs | Moyen | Messages utilisateur clairs |
| Page parametres | Moyen | Configuration dans l'UI |

### Moyenne priorite

| Fonctionnalite | Effort | Description |
|----------------|--------|-------------|
| Export donnees | Moyen | Backup des SMS/contacts |
| Photos contacts | Moyen | Avatars dans l'UI |
| Notifications push | Moyen | Alertes navigateur |
| Mode hors-ligne | Eleve | Queue des messages |
| Multi-langue | Moyen | i18n francais/anglais |

### Basse priorite

| Fonctionnalite | Effort | Description |
|----------------|--------|-------------|
| Chiffrement E2E | Eleve | Securite des messages |
| Historique appels | Eleve | Sync des appels |
| MMS/Images | Eleve | Pieces jointes |
| Reponses rapides | Faible | Templates de messages |
| Reactions | Moyen | Emojis sur messages |

---

## Installation

### Prerequis

- Node.js 18+
- pnpm 8+
- Android Studio (pour l'APK)
- Android 10+ sur le telephone

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
powershell -NoProfile -Command "& 'C:\Users\AJB_ELITE\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r 'apps/android/app/build/outputs/apk/debug/app-debug.apk'"
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

#### POST /api/auth/verify
Verifie un token.

```json
// Request
{ "token": "550e8400-..." }

// Response
{ "valid": true, "deviceName": "Redmi Note 13 Pro" }
```

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
Messages d'une conversation.

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
Recherche dans les SMS.

#### POST /api/messages/thread/:threadId/read
Marque un thread comme lu.

#### GET /api/messages/stats
Statistiques des messages.

### Contacts

#### GET /api/contacts
Liste des contacts.

```json
// Response
[
  {
    "id": "1",
    "name": "John Doe",
    "phoneNumbers": ["+33612345678", "+33698765432"]
  }
]
```

#### GET /api/contacts/search?q=query
Recherche de contacts.

#### GET /api/contacts/by-phone/:phoneNumber
Trouve un contact par numero.

### Notifications

#### GET /api/notifications
Liste des notifications.

#### GET /api/notifications/apps
Liste des apps avec notifications.

#### POST /api/notifications/:id/dismiss
Rejette une notification.

#### POST /api/notifications/dismiss-all
Rejette toutes les notifications.

---

## Socket Events

### Phone → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `phone_connected` | `{deviceName, model, androidVersion}` | Telephone connecte |
| `new_sms` | `SmsMessage` | Nouveau SMS recu |
| `sms_batch` | `SmsMessage[]` | Batch de SMS |
| `new_notification` | `AppNotification` | Nouvelle notification |
| `battery_update` | `{level, isCharging}` | Mise a jour batterie |
| `contacts_sync` | `Contact[]` | Sync des contacts |
| `sms_sent` | `{messageId, address}` | SMS envoye |
| `sms_delivered` | `{messageId, address}` | SMS livre |
| `sms_failed` | `{messageId, address, error}` | SMS echoue |

### Server → Phone

| Event | Payload | Description |
|-------|---------|-------------|
| `send_sms` | `{address, body}` | Demande d'envoi SMS |
| `dismiss_notification` | `{id}` | Rejeter notification |
| `request_sync` | - | Demande de sync |

### Server → Web

| Event | Payload | Description |
|-------|---------|-------------|
| `phone_status` | `{connected, deviceName, ...}` | Status telephone |
| `sms_sync_complete` | `{count}` | Sync SMS terminee |
| `contacts_sync_complete` | `{count}` | Sync contacts terminee |
| `sms_status_update` | `{messageId, status}` | Statut livraison |

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
CREATE INDEX idx_contact_phones_number ON contact_phones(phone_number);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_notifications_package ON notifications(package_name);
```

---

## Securite

### Mesures actuelles

- Token UUID pour l'authentification
- Communication locale uniquement (pas d'exposition internet)
- Validation basique des payloads

### Recommandations

| Mesure | Priorite | Status |
|--------|----------|--------|
| HTTPS/WSS | Haute | Non implemente |
| Rate limiting | Haute | Non implemente |
| Input validation | Haute | Partiel |
| Logs d'audit | Moyenne | Non implemente |
| Chiffrement DB | Basse | Non implemente |

### Pour deploiement internet

Si vous souhaitez exposer sur internet :

1. Utiliser HTTPS avec certificat Let's Encrypt
2. Ajouter Nginx en reverse proxy
3. Configurer fail2ban
4. Activer rate limiting
5. Utiliser des tokens JWT
6. Chiffrer les donnees sensibles

---

## Roadmap

### v1.1 - Stabilite
- [ ] Validation des inputs
- [ ] Gestion d'erreurs amelioree
- [ ] Page parametres
- [ ] Logs serveur

### v1.2 - UX
- [ ] Notifications navigateur
- [ ] Export/backup des donnees
- [ ] Photos contacts
- [ ] Themes personnalisables

### v1.3 - Fonctionnalites
- [ ] Mode hors-ligne avec queue
- [ ] Historique des appels
- [ ] Support MMS/images
- [ ] Multi-langue (i18n)

### v2.0 - Cloud (optionnel)
- [ ] Deploiement VPS
- [ ] Multi-utilisateurs
- [ ] Chiffrement E2E
- [ ] Applications mobiles natives

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
