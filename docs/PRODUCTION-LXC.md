# LocalMighty - Documentation Production LXC

## Informations du Conteneur

| Propriete | Valeur |
|-----------|--------|
| **ID Conteneur** | 100 |
| **Hostname** | localmighty |
| **IP** | 172.10.10.50 |
| **OS** | Debian 12 (Bookworm) |
| **Proxmox Host** | 172.10.10.16 |

---

## URLs d'Acces

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard Web | http://172.10.10.50:5173 | Interface utilisateur |
| API Server | http://172.10.10.50:3001 | Backend Socket.io + REST |
| Health Check | http://172.10.10.50:3001/health | Verification etat serveur |

---

## Acces au Conteneur

### Depuis le PC (SSH)

```bash
# Connexion directe au conteneur
ssh root@172.10.10.50

# Ou via le host Proxmox
ssh root@172.10.10.16
pct enter 100
```

### Depuis l'interface Proxmox

1. Ouvrir https://172.10.10.16:8006
2. Selectionner le conteneur **100 (localmighty)**
3. Onglet **Console** > **Shell**

---

## Commandes Majeures

### Gestion des Services (PM2)

```bash
# Voir le statut des services
pm2 status

# Voir les logs en temps reel
pm2 logs

# Voir les 100 dernieres lignes de logs
pm2 logs --lines 100

# Redemarrer tous les services
pm2 restart all

# Redemarrer un service specifique
pm2 restart localmighty-server
pm2 restart localmighty-web

# Arreter tous les services
pm2 stop all

# Demarrer tous les services
pm2 start all

# Supprimer et recreer les services
pm2 delete all
pm2 start /opt/localmighty/start-server.sh --name localmighty-server
pm2 start /opt/localmighty/start-web.sh --name localmighty-web
pm2 save
```

### Gestion du Conteneur (depuis Proxmox Host)

```bash
# Voir le statut du conteneur
pct status 100

# Demarrer le conteneur
pct start 100

# Arreter le conteneur
pct stop 100

# Redemarrer le conteneur
pct reboot 100

# Entrer dans le conteneur
pct enter 100

# Executer une commande dans le conteneur
pct exec 100 -- pm2 status
pct exec 100 -- pm2 logs --lines 50
```

---

## Verification de l'Etat

### 1. Verifier les Services PM2

```bash
pm2 status
```

Resultat attendu :
```
┌────┬───────────────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name                  │ mode    │ pid     │ uptime   │ ↺      │ status    │
├────┼───────────────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0  │ localmighty-server    │ fork    │ XXXX    │ Xh       │ 0      │ online    │
│ 1  │ localmighty-web       │ fork    │ XXXX    │ Xh       │ 0      │ online    │
└────┴───────────────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

### 2. Verifier le Health Check

```bash
curl http://localhost:3001/health
```

Resultat attendu :
```json
{"status":"ok","timestamp":1234567890}
```

### 3. Verifier les Ports Ouverts

```bash
ss -tlnp | grep -E '3001|5173'
```

Resultat attendu :
```
LISTEN  0  511  0.0.0.0:3001  0.0.0.0:*  users:(("node",pid=XXXX,fd=XX))
LISTEN  0  511  0.0.0.0:5173  0.0.0.0:*  users:(("node",pid=XXXX,fd=XX))
```

### 4. Verifier la Connectivite Reseau

```bash
# Depuis le conteneur
ping -c 2 172.10.10.254  # Gateway
ping -c 2 8.8.8.8        # Internet

# Depuis le PC
curl http://172.10.10.50:3001/health
curl -I http://172.10.10.50:5173
```

---

## Contenu du Conteneur

### Structure des Fichiers

```
/opt/localmighty/
├── apps/
│   ├── server/           # Backend Node.js
│   │   ├── src/          # Code source TypeScript
│   │   ├── data/         # Base de donnees SQLite
│   │   │   └── localmighty.db
│   │   └── node_modules/
│   └── web/              # Frontend SvelteKit
│       ├── src/          # Code source Svelte
│       ├── build/        # Build production
│       └── node_modules/
├── packages/
│   └── shared/           # Types partages
├── start-server.sh       # Script demarrage serveur
├── start-web.sh          # Script demarrage web
└── ecosystem.config.cjs  # Config PM2
```

### Verifier le Contenu

```bash
# Lister les fichiers principaux
ls -la /opt/localmighty/

# Verifier la base de donnees
ls -lh /opt/localmighty/apps/server/data/

# Taille de la base de donnees
du -h /opt/localmighty/apps/server/data/localmighty.db

# Verifier les scripts de demarrage
cat /opt/localmighty/start-server.sh
cat /opt/localmighty/start-web.sh
```

### Base de Donnees SQLite

```bash
# Ouvrir la base de donnees
sqlite3 /opt/localmighty/apps/server/data/localmighty.db

# Commandes SQLite utiles
.tables                          # Lister les tables
SELECT COUNT(*) FROM messages;   # Nombre de SMS
SELECT COUNT(*) FROM contacts;   # Nombre de contacts
SELECT COUNT(*) FROM calls;      # Nombre d'appels
.quit                            # Quitter
```

---

## Mise a Jour

### Mettre a Jour LocalMighty

```bash
cd /opt/localmighty

# Arreter les services
pm2 stop all

# Mettre a jour le code
git pull origin main

# Reinstaller les dependances
pnpm install

# Rebuild le web
cd apps/web && pnpm exec vite build && cd ../..

# Redemarrer les services
pm2 restart all
```

---

## Depannage

### Service qui ne demarre pas

```bash
# Voir les logs d'erreur
pm2 logs localmighty-server --err --lines 50
pm2 logs localmighty-web --err --lines 50

# Redemarrer manuellement
pm2 delete localmighty-server
cd /opt/localmighty/apps/server
NODE_ENV=production PORT=3001 HOST=0.0.0.0 npx tsx src/index.ts
```

### Probleme de Connexion

```bash
# Verifier que les services ecoutent
ss -tlnp | grep node

# Verifier le firewall (si active)
iptables -L -n

# Tester depuis le conteneur
curl http://localhost:3001/health
curl http://localhost:5173
```

### Reinitialiser Completement

```bash
# Arreter et supprimer PM2
pm2 delete all
pm2 kill

# Supprimer et recloner
rm -rf /opt/localmighty
git clone https://github.com/SaitamaHeisenberg/LocalMighty.git /opt/localmighty
cd /opt/localmighty
pnpm install

# Rebuild web
cd apps/web && pnpm exec vite build && cd ../..

# Recreer les scripts et demarrer
pm2 start /opt/localmighty/start-server.sh --name localmighty-server
pm2 start /opt/localmighty/start-web.sh --name localmighty-web
pm2 save
pm2 startup
```

---

## Configuration Android

Pour connecter l'application Android au serveur de production :

1. Ouvrir l'app **LocalMighty** sur le telephone
2. Aller dans **Parametres** ou **Configuration**
3. Entrer l'adresse du serveur : `172.10.10.50:3001`
4. Verifier que le telephone est sur le meme reseau local

---

## Sauvegardes

### Sauvegarder la Base de Donnees

```bash
# Copier la base de donnees
cp /opt/localmighty/apps/server/data/localmighty.db /root/backup-$(date +%Y%m%d).db

# Ou depuis le PC via SCP
scp root@172.10.10.50:/opt/localmighty/apps/server/data/localmighty.db ./backup.db
```

### Sauvegarder le Conteneur (Proxmox)

```bash
# Depuis le host Proxmox
vzdump 100 --storage local --compress zstd
```

---

## Ressources

- **Repository GitHub** : https://github.com/SaitamaHeisenberg/LocalMighty
- **Proxmox** : https://172.10.10.16:8006
- **PM2 Documentation** : https://pm2.keymetrics.io/docs
