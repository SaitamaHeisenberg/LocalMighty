#!/bin/bash
# LocalMighty - Script d'installation production (LXC Debian/Ubuntu)
set -e

echo "========================================="
echo "  LocalMighty - Installation Production"
echo "========================================="

# Variables
APP_DIR="/opt/localmighty"
APP_USER="localmighty"

# Mise a jour systeme
echo "[1/7] Mise a jour du systeme..."
apt update && apt upgrade -y

# Installation des dependances
echo "[2/7] Installation des dependances..."
apt install -y curl git build-essential

# Installation Node.js 20 LTS
echo "[3/7] Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Installation pnpm
echo "[4/7] Installation de pnpm..."
npm install -g pnpm

# Installation PM2 pour gestion des processus
echo "[5/7] Installation de PM2..."
npm install -g pm2

# Creer utilisateur applicatif
echo "[6/7] Creation de l'utilisateur..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d $APP_DIR -s /bin/bash $APP_USER
fi

# Cloner le projet
echo "[7/7] Clonage du projet..."
if [ ! -d "$APP_DIR/.git" ]; then
    git clone https://github.com/SaitamaHeisenberg/LocalMighty.git $APP_DIR
    chown -R $APP_USER:$APP_USER $APP_DIR
fi

echo ""
echo "========================================="
echo "  Installation terminee!"
echo "  Executez maintenant: ./setup-production.sh"
echo "========================================="
