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
echo "[1/5] Installation des dependances npm..."
sudo -u $APP_USER pnpm install

# Build du dashboard web
echo "[2/5] Build du dashboard web..."
sudo -u $APP_USER pnpm --filter @localmighty/web build

# Copier le build web dans le serveur
echo "[3/5] Copie du build web vers le serveur..."
rm -rf $APP_DIR/apps/server/web-build
cp -r $APP_DIR/apps/web/build $APP_DIR/apps/server/web-build
chown -R $APP_USER:$APP_USER $APP_DIR/apps/server/web-build

# Configuration PM2
echo "[4/5] Configuration PM2..."

# Creer fichier ecosystem PM2
cat > $APP_DIR/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'localmighty',
      cwd: '/opt/localmighty/apps/server',
      script: 'src/index.ts',
      interpreter: 'node_modules/.bin/tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      }
    }
  ]
};
EOF

chown $APP_USER:$APP_USER $APP_DIR/ecosystem.config.cjs

# Arreter les anciens processus s'ils existent
echo "[5/5] Demarrage du serveur..."
sudo -u $APP_USER pm2 delete all 2>/dev/null || true

# Demarrer avec PM2
sudo -u $APP_USER pm2 start $APP_DIR/ecosystem.config.cjs

# Sauvegarder config PM2
sudo -u $APP_USER pm2 save

# Configurer demarrage automatique
pm2 startup systemd -u $APP_USER --hp /opt/localmighty 2>/dev/null || true

# Obtenir l'IP
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  LocalMighty est en production!"
echo "========================================="
echo ""
echo "  Dashboard + API: http://$IP:3001"
echo ""
echo "  Commandes utiles:"
echo "    pm2 status        - Voir l'etat"
echo "    pm2 logs          - Voir les logs"
echo "    pm2 restart all   - Redemarrer"
echo ""
echo "  Config Android: utilisez $IP:3001"
echo "========================================="
