#!/bin/bash
# VPS Deployment Script for InuaBreath Backend
# GitHub'daki backend/ klasörü her seferinde VPS'te ~/inua-breath-backend ile eşlenir.
# Kullanım: VPS'te herhangi bir yerden: ./deploy-vps.sh  veya  bash /path/to/deploy-vps.sh

set -e

echo "🚀 InuaBreath Backend Deployment"
echo "=================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# GitHub backend/ = VPS'te bu klasör (sabit)
BACKEND_DIR="${HOME}/inua-breath-backend"
CONTAINER_NAME="inua-breath-backend"
REPO_URL="https://github.com/okanist/inuabreathagent.git"

mkdir -p "$BACKEND_DIR"
cd "$BACKEND_DIR"
echo "📁 Target (GitHub backend/ = VPS): $BACKEND_DIR"

# .env yedekle
if [ -f .env ]; then
  cp .env /tmp/inua-backend-env-backup
  echo "✅ .env backed up"
fi

# Güncel kodu al: .git yoksa clone + kopyala, varsa pull + kopyala
if [ ! -d .git ]; then
  echo "${YELLOW}📥 No .git: cloning repo and copying backend...${NC}"
  cd ~
  rm -rf inua-breath-backend-temp
  git clone --depth 1 "$REPO_URL" inua-breath-backend-temp
  mkdir -p "$BACKEND_DIR"
  cp -r inua-breath-backend-temp/backend/. "$BACKEND_DIR/"
  [ -f /tmp/inua-backend-env-backup ] && cp /tmp/inua-backend-env-backup "$BACKEND_DIR/.env" && echo "✅ .env restored"
  rm -rf inua-breath-backend-temp
  cd "$BACKEND_DIR"
else
  echo "${YELLOW}📥 Pulling latest from GitHub...${NC}"
  git pull origin main
  if [ -d backend ]; then
    cp -r backend/. . 2>/dev/null || true
  fi
  [ -f /tmp/inua-backend-env-backup ] && [ ! -f .env ] && cp /tmp/inua-backend-env-backup .env && echo "✅ .env restored"
fi

# all_db.json kontrolü
if [ ! -f all_db.json ]; then
  echo "❌ all_db.json not found!"
  ls -la
  exit 1
fi
echo "✅ all_db.json present ($(wc -l < all_db.json) lines)"

# Docker
echo ""
echo "${YELLOW}🐳 Rebuilding Docker...${NC}"
docker compose down || true
docker compose build --no-cache
docker compose up -d

echo ""
echo "${YELLOW}🏥 Health check...${NC}"
sleep 5
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
  echo "${GREEN}✅ Backend is healthy!${NC}"
else
  echo "❌ Health check failed. Logs:"
  docker compose logs --tail 30
  exit 1
fi

echo ""
echo "${GREEN}✅ Deployment complete!${NC}"
echo "Backend: http://localhost:8001"
