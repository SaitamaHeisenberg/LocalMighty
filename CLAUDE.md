# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LocalMighty is a local Wi-Fi SMS, calls, and notifications sync system between Android phones and PC. All communication stays on the local network (no internet required).

## Commands

### Development
```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run all services (server + web) via Turborepo
pnpm dev:server           # Run server only (port 3001)
pnpm dev:web              # Run web dashboard only (port 5173)
```

### Build
```bash
pnpm build                # Build all packages
pnpm build:server         # Build server only
pnpm build:web            # Build web dashboard only
```

### Android APK Build (PowerShell)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "apps/android/build_apk.ps1"
```

### Android APK Install
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "apps/android/app/build/outputs/apk/debug/app-debug.apk"
```

### Deploy to Production (Proxmox LXC at 172.10.10.50)
```bash
# Build and deploy web dashboard
pnpm --filter @localmighty/web build && \
scp -r apps/web/build root@172.10.10.50:/opt/localmighty/apps/web/ && \
ssh root@172.10.10.50 "rm -rf /opt/localmighty/apps/server/web-build && cp -r /opt/localmighty/apps/web/build /opt/localmighty/apps/server/web-build && pm2 restart all"
```

## Architecture

```
┌─────────────────┐     WebSocket     ┌─────────────────┐     WebSocket     ┌─────────────────┐
│  Android App    │◄─────────────────►│  Node.js Server │◄─────────────────►│  SvelteKit Web  │
│  (Kotlin/Compose)│                   │  (Express)      │                   │  (Dashboard)    │
└─────────────────┘                   └─────────────────┘                   └─────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────┐
                                      │     SQLite      │
                                      │  (better-sqlite3)│
                                      └─────────────────┘
```

## Monorepo Structure

- **apps/server/** - Node.js backend with Express + Socket.io + SQLite
  - `src/routes/` - REST API endpoints (messages, contacts, calls, notifications, auth)
  - `src/socket/handlers/` - WebSocket event handlers (sms, notification, status, contacts, calls)
  - `src/config/database.ts` - SQLite schema and queries
  - `src/middleware/auth.ts` - Token validation

- **apps/web/** - SvelteKit dashboard with Tailwind CSS
  - `src/lib/stores/` - Svelte stores (socket, messages, contacts, calls, notifications, theme, etc.)
  - `src/lib/components/sms/` - SMS UI components (ConversationList, ConversationDetail, ModernChatView)
  - `src/routes/` - Pages (sms, calls, contacts, notifications, settings)

- **apps/android/** - Kotlin + Jetpack Compose app
  - `network/SocketManager.kt` - Socket.io client singleton
  - `services/SyncForegroundService.kt` - Background sync service
  - `observers/SmsContentObserver.kt` - SMS detection via ContentObserver
  - `services/LocalMightyNotificationListener.kt` - NotificationListenerService
  - `data/AppPreferences.kt` - DataStore preferences

- **packages/shared/** - Shared TypeScript types and constants
  - `src/constants/socket-events.ts` - Socket event names
  - `src/types/` - Shared interfaces (SmsMessage, Call, Notification, etc.)

## Key Patterns

### Socket Events
All socket events are defined in `packages/shared/src/constants/socket-events.ts`. Both server and web use these constants.

### Web Stores
Svelte stores in `apps/web/src/lib/stores/` manage all state. Key stores:
- `socket.ts` - WebSocket connection management
- `messages.ts` - SMS threads and messages with deleteThread()
- `contacts.ts` - Contact list with phone lookup
- `calls.ts` - Call history
- `notifications.ts` - App notifications
- `chatLayout.ts` - Layout preferences (classic/modern, compact mode)
- `theme.ts` - Dark/light/system theme

### API Calls
Web uses `apiUrl()` from `apps/web/src/lib/api.ts` to construct API URLs. The server port is 3001.

### Production Deployment
The server serves the web build from `/opt/localmighty/apps/server/web-build/`. Both locations must be updated when deploying:
1. `/opt/localmighty/apps/web/build/` (frontend direct access on port 5173)
2. `/opt/localmighty/apps/server/web-build/` (served by backend on port 3001)

## Xiaomi/HyperOS Notes
For background sync to work reliably on Xiaomi devices:
1. Enable Autostart in Security app
2. Disable battery optimization for LocalMighty
3. Lock app in recent tasks
