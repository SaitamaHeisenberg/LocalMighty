# LocalMighty

Synchronisation SMS, appels et notifications entre Android et PC via Wi-Fi local.

[![GitHub](https://img.shields.io/github/license/SaitamaHeisenberg/LocalMighty)](LICENSE)

> **Documentation complete** : [DOCUMENTATION.md](DOCUMENTATION.md)

## Fonctionnalites

- **SMS** : Sync temps reel, envoi depuis PC, envoi en masse, suivi livraison
- **Appels** : Historique complet, appels depuis PC, filtre par type
- **Notifications** : Mirroring, reponses directes, filtrage par app
- **Contacts** : Sync complete, recherche intelligente
- **Batterie** : Niveau et etat de charge en temps reel
- **Interface** : Mode clair/sombre, layout classique/moderne, mode compact
- **Hub Partage** : Clipboard sync, glisser-deposer fichiers, coffre-fort mots de passe (chiffre), TOTP

## Stack Technique

| Composant | Technologies |
|-----------|--------------|
| Android | Kotlin, Jetpack Compose, Socket.io-client |
| Serveur | Node.js, Express, Socket.io, SQLite |
| Web | SvelteKit, Tailwind CSS, Socket.io-client |
| Partage | TypeScript (types + events) |

## Structure

```
LocalMighty/
├── apps/
│   ├── android/     # App Android (Kotlin + Compose)
│   ├── server/      # Backend (Node.js + SQLite)
│   └── web/         # Dashboard (SvelteKit)
└── packages/
    └── shared/      # Types TypeScript partages
```

## Installation Rapide

### Prerequis

- Node.js 18+
- pnpm 8+
- Android Studio (pour l'app Android)
- Telephone et PC sur le meme reseau Wi-Fi

### 1. Serveur + Dashboard

```bash
pnpm install
pnpm dev           # Lance serveur (3001) + web (5173)
```

### 2. Application Android

```powershell
# Build APK
powershell -NoProfile -ExecutionPolicy Bypass -File "apps/android/build_apk.ps1"

# Installer sur telephone
adb install -r "apps/android/app/build/outputs/apk/debug/app-debug.apk"
```

### 3. Connexion

1. Ouvrir http://localhost:5173 dans le navigateur
2. Dans l'app Android, entrer l'IP du PC et port 3001
3. Appuyer sur "Connecter"

## Architecture

```
┌─────────────────┐     WebSocket     ┌─────────────────┐     WebSocket     ┌─────────────────┐
│  Android App    │◄─────────────────►│  Node.js Server │◄─────────────────►│  SvelteKit Web  │
│  (Kotlin/Compose)│                   │  (Express)      │                   │  (Dashboard)    │
└─────────────────┘                   └────────┬────────┘                   └─────────────────┘
                                               │
                                      ┌────────▼────────┐
                                      │     SQLite      │
                                      │  - messages     │
                                      │  - calls        │
                                      │  - contacts     │
                                      │  - notifications│
                                      │  - hub (vault)  │
                                      └─────────────────┘

┌─────────────────┐     WebSocket     ┌─────────────────┐     WebSocket     ┌─────────────────┐
│  Browser PC 1   │◄─────────────────►│  Node.js Server │◄─────────────────►│  Browser PC 2   │
│  (Hub Partage)  │   /share ns       │  (Express)      │   /share ns       │  (Hub Partage)  │
└─────────────────┘                   └─────────────────┘                   └─────────────────┘
```

## Configuration Xiaomi/HyperOS

Pour que l'app fonctionne en arriere-plan :

1. **Securite** > **Autostart** > Activer LocalMighty
2. **Parametres** > **Apps** > **LocalMighty** > **Batterie** > "Aucune restriction"
3. Verrouiller l'app dans les taches recentes

## Permissions Android

| Permission | Usage |
|------------|-------|
| READ_SMS, SEND_SMS, RECEIVE_SMS | Lecture et envoi de SMS |
| READ_CONTACTS | Synchronisation des contacts |
| READ_CALL_LOG, CALL_PHONE | Historique et appels depuis PC |
| NotificationListener | Mirroring des notifications |
| FOREGROUND_SERVICE | Sync en arriere-plan |

## Securite

- Communication locale uniquement (pas d'Internet)
- Authentification par token UUID
- HTTP autorise uniquement sur IP privees (10.x, 172.16.x, 192.168.x)
- Donnees stockees localement (SQLite)

## Developpement

```bash
pnpm dev           # Tous les services
pnpm dev:server    # Serveur uniquement (port 3001)
pnpm dev:web       # Dashboard uniquement (port 5173)
pnpm build         # Build production
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/messages/threads` | Liste des conversations |
| `GET /api/messages/thread/:id` | Messages d'une conversation |
| `DELETE /api/messages/thread/:id` | Supprimer conversation |
| `GET /api/contacts` | Liste des contacts |
| `GET /api/calls` | Historique des appels |
| `GET /api/notifications` | Notifications |
| `POST /api/auth/pair` | Generer token pairing |
| `GET /api/hub/text` | Clipboard partage |
| `POST /api/hub/upload` | Upload fichier (max 100 Mo) |
| `GET /api/hub/vault/entries` | Entrees coffre-fort (chiffrees) |

## Roadmap

- [x] SMS sync + envoi + bulk
- [x] Historique appels + dial depuis PC
- [x] Sync contacts
- [x] Notifications + reponses
- [x] Mode compact
- [x] Layouts chat (classique/moderne)
- [x] Suppression conversations
- [x] Hub Partage (clipboard, fichiers, historique)
- [x] Coffre-fort mots de passe (chiffrement client-side)
- [x] TOTP (2FA) dans le coffre-fort
- [x] Envoi par SMS depuis le Hub
- [ ] Multi-utilisateurs (authentification JWT)
- [ ] Chiffrement E2E
- [ ] Support MMS/images

## License

MIT
