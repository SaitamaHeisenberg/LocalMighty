#!/bin/bash
# LocalMighty - Mise a jour production
set -e

APP_DIR="/opt/localmighty"
APP_USER="localmighty"

echo "========================================="
echo "  LocalMighty - Mise a jour"
echo "========================================="

cd $APP_DIR

# Pull des dernieres modifications
echo "[1/5] Pull des modifications..."
sudo -u $APP_USER git pull origin main

# Installation des dependances
echo "[2/5] Installation des dependances..."
sudo -u $APP_USER pnpm install

# Build du dashboard web
echo "[3/5] Build du dashboard web..."
sudo -u $APP_USER pnpm --filter @localmighty/web build

# Copier le build web dans le serveur
echo "[4/5] Copie du build web vers le serveur..."
rm -rf $APP_DIR/apps/server/web-build
cp -r $APP_DIR/apps/web/build $APP_DIR/apps/server/web-build
chown -R $APP_USER:$APP_USER $APP_DIR/apps/server/web-build

# Redemarrer le serveur
echo "[5/5] Redemarrage du serveur..."
sudo -u $APP_USER pm2 restart localmighty

# Obtenir l'IP
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  Mise a jour terminee!"
echo "========================================="
echo ""
echo "  Dashboard + API: http://$IP:3001"
echo ""
echo "  pm2 logs - pour voir les logs"
echo "========================================="
