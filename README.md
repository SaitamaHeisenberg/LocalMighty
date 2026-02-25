# LocalMighty

Synchronisation SMS et notifications entre Android et PC via Wi-Fi local.

## Structure du projet

```
LocalMighty/
├── apps/
│   ├── server/     # Backend Node.js (Express + Socket.io + SQLite)
│   ├── web/        # Dashboard SvelteKit
│   └── android/    # Application Android (Kotlin + Compose)
└── packages/
    └── shared/     # Types TypeScript partages
```

## Prerequis

- **Node.js** 18+
- **pnpm** 8+
- **Android Studio** (pour l'app Android)
- Telephone et PC sur le **meme reseau Wi-Fi**

## Installation

### 1. Installer les dependances

```bash
pnpm install
```

### 2. Lancer le serveur

```bash
pnpm dev:server
```

Le serveur affichera son adresse IP locale (ex: `http://192.168.1.100:3001`).

### 3. Lancer le dashboard web

```bash
pnpm dev:web
```

Ouvrir http://localhost:5173 dans un navigateur.

### 4. Installer l'app Android

1. Ouvrir `apps/android` dans Android Studio
2. Connecter votre telephone en mode debug USB
3. Build & Run l'application
4. Dans l'app, entrer l'IP du serveur et appuyer sur "Connecter"

## Configuration Android

### Permissions requises

- **SMS** : Lecture et envoi de SMS
- **Notifications** : Acces au service de notifications
- **Internet** : Communication avec le serveur

### Xiaomi/HyperOS

Pour que l'app fonctionne en arriere-plan :

1. Ouvrir **Securite** > **Autostart** > Activer LocalMighty
2. **Parametres** > **Apps** > **LocalMighty** > **Batterie** > "Aucune restriction"
3. Verrouiller l'app dans les taches recentes

## Fonctionnalites

- Synchronisation SMS en temps reel (<5s)
- Envoi de SMS depuis le PC
- Mirroring des notifications
- Affichage batterie du telephone
- Interface web responsive

## Securite

- Communication locale uniquement (pas d'Internet)
- Authentification par token
- Donnees stockees localement (SQLite)

## Developpement

```bash
# Tous les services en parallele
pnpm dev

# Serveur uniquement
pnpm dev:server

# Dashboard uniquement
pnpm dev:web

# Build
pnpm build
```

## Architecture

```
Android App ←──WebSocket──→ Node.js Server ←──WebSocket──→ SvelteKit Dashboard
     │                           │
     │                           ├── SQLite (messages, notifications)
     │                           └── mDNS Discovery
     │
     ├── SmsContentObserver (SMS entrants/sortants)
     ├── NotificationListenerService (notifications)
     └── ForegroundService (execution en arriere-plan)
```

## License

MIT
