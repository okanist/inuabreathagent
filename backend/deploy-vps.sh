#!/bin/bash
# VPS Deployment Script for InuaBreath Backend
# Kullanım: ./deploy-vps.sh

set -e

echo "🚀 InuaBreath Backend Deployment"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/path/to/backend"  # VPS'teki backend klasörü yolunu ayarla
CONTAINER_NAME="inua-breath-backend"
NGROK_DOMAIN="loveliest-rayne-onwards.ngrok-free.dev"

# 1. Git Pull
echo ""
echo "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
cd "$BACKEND_DIR"
git pull origin main

# 2. Check for .env changes
echo ""
echo "${YELLOW}🔍 Checking for .env changes...${NC}"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    # .env değişikliklerini kontrol et (opsiyonel)
    # git diff HEAD .env
else
    echo "⚠️  .env file not found. Make sure to create it!"
fi

# 3. Rebuild Docker Container
echo ""
echo "${YELLOW}🐳 Rebuilding Docker container...${NC}"
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Check container status
echo ""
echo "${YELLOW}📊 Checking container status...${NC}"
sleep 3
docker ps | grep "$CONTAINER_NAME" || echo "⚠️  Container not running!"

# 5. Health check
echo ""
echo "${YELLOW}🏥 Health check...${NC}"
sleep 2
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "${GREEN}✅ Backend is healthy!${NC}"
else
    echo "❌ Backend health check failed!"
    echo "Check logs: docker logs $CONTAINER_NAME"
    exit 1
fi

# 6. Ngrok status (if using ngrok)
if command -v ngrok &> /dev/null; then
    echo ""
    echo "${YELLOW}🌐 Checking ngrok status...${NC}"
    NGROK_PID=$(pgrep -f "ngrok http 8001" || echo "")
    if [ -n "$NGROK_PID" ]; then
        echo "${GREEN}✅ Ngrok is running (PID: $NGROK_PID)${NC}"
        NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
        if [ -n "$NGROK_URL" ]; then
            echo "   URL: $NGROK_URL"
            if [ "$NGROK_URL" != "https://$NGROK_DOMAIN" ]; then
                echo "   ⚠️  URL changed! Update Vercel environment variable:"
                echo "   EXPO_PUBLIC_API_URL=$NGROK_URL"
            fi
        fi
    else
        echo "⚠️  Ngrok is not running. Starting..."
        nohup ngrok http 8001 --domain="$NGROK_DOMAIN" > /tmp/ngrok.log 2>&1 &
        sleep 3
        echo "${GREEN}✅ Ngrok started${NC}"
    fi
fi

# 7. Show logs (last 20 lines)
echo ""
echo "${YELLOW}📋 Recent logs:${NC}"
docker logs --tail 20 "$CONTAINER_NAME"

echo ""
echo "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Backend URL: http://localhost:8001"
if [ -n "$NGROK_URL" ]; then
    echo "Public URL: $NGROK_URL"
fi
