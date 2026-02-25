#!/bin/bash
# LocalMighty - Configuration production
set -e

APP_DIR="/opt/localmighty"
APP_USER="localmighty"

echo "========================================="
echo "  LocalMighty - Configuration Production"
echo "========================================="

cd $APP_DIR

# Installation des dependances
echo "[1/4] Installation des dependances npm..."
sudo -u $APP_USER pnpm install

# Build du serveur
echo "[2/4] Build du serveur..."
sudo -u $APP_USER pnpm --filter @localmighty/server build

# Build du dashboard web
echo "[3/4] Build du dashboard web..."
sudo -u $APP_USER pnpm --filter @localmighty/web build

# Configuration PM2
echo "[4/4] Configuration PM2..."

# Creer fichier ecosystem PM2
cat > $APP_DIR/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'localmighty-server',
      cwd: '/opt/localmighty/apps/server',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      }
    },
    {
      name: 'localmighty-web',
      cwd: '/opt/localmighty/apps/web',
      script: 'build/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5173,
        HOST: '0.0.0.0',
        ORIGIN: 'http://0.0.0.0:5173'
      }
    }
  ]
};
EOF

chown $APP_USER:$APP_USER $APP_DIR/ecosystem.config.cjs

# Demarrer avec PM2
sudo -u $APP_USER pm2 start $APP_DIR/ecosystem.config.cjs

# Sauvegarder config PM2
sudo -u $APP_USER pm2 save

# Configurer demarrage automatique
pm2 startup systemd -u $APP_USER --hp /opt/localmighty

# Obtenir l'IP
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  LocalMighty est en production!"
echo "========================================="
echo ""
echo "  Dashboard: http://$IP:5173"
echo "  Serveur:   http://$IP:3001"
echo ""
echo "  Commandes utiles:"
echo "    pm2 status        - Voir l'etat"
echo "    pm2 logs          - Voir les logs"
echo "    pm2 restart all   - Redemarrer"
echo ""
echo "  Config Android: utilisez $IP:3001"
echo "========================================="
