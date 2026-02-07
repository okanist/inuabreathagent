#!/bin/bash
# Ngrok setup script for VPS

set -e

echo "🌐 Ngrok Setup for InuaBreath Backend"
echo "======================================"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "📥 Installing ngrok..."
    
    # Download ngrok
    wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
    tar -xzf ngrok-v3-stable-linux-amd64.tgz
    sudo mv ngrok /usr/local/bin/
    rm ngrok-v3-stable-linux-amd64.tgz
    
    echo "✅ Ngrok installed"
else
    echo "✅ Ngrok already installed"
fi

# Check if authtoken is set
if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo ""
    echo "⚠️  NGROK_AUTHTOKEN environment variable not set"
    echo "Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    read -p "Enter your Ngrok authtoken: " authtoken
    ngrok config add-authtoken "$authtoken"
    echo "✅ Authtoken configured"
else
    ngrok config add-authtoken "$NGROK_AUTHTOKEN"
    echo "✅ Authtoken configured from environment"
fi

# Check if static domain is set
if [ -z "$NGROK_DOMAIN" ]; then
    echo ""
    echo "ℹ️  No static domain set. Using dynamic URL (will change on restart)"
    echo "To use static domain, set NGROK_DOMAIN environment variable"
    echo ""
    read -p "Enter static domain (or press Enter to skip): " domain
    
    if [ -n "$domain" ]; then
        NGROK_DOMAIN="$domain"
    fi
fi

# Start ngrok
echo ""
echo "🚀 Starting ngrok tunnel..."
echo "Backend should be running on port 8001"

if [ -n "$NGROK_DOMAIN" ]; then
    echo "Using static domain: $NGROK_DOMAIN"
    ngrok http 8001 --domain="$NGROK_DOMAIN" &
else
    echo "Using dynamic URL"
    ngrok http 8001 &
fi

NGROK_PID=$!
echo "Ngrok PID: $NGROK_PID"

# Wait a bit for ngrok to start
sleep 3

# Get the public URL
if command -v jq &> /dev/null; then
    NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')
    echo ""
    echo "✅ Ngrok tunnel active!"
    echo "Public URL: $NGROK_URL"
    echo ""
    echo "📋 Add this to Vercel environment variables:"
    echo "   EXPO_PUBLIC_API_URL=$NGROK_URL"
else
    echo ""
    echo "✅ Ngrok tunnel active!"
    echo "Get URL from: http://127.0.0.1:4040"
    echo "Or run: curl http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'"
fi

echo ""
echo "Press Ctrl+C to stop ngrok"
wait $NGROK_PID
