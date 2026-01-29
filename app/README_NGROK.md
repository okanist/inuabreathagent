# Ngrok ile VPS → Vercel Bağlantısı

## Kurulum

### 1. VPS'de Ngrok Kurulumu

```bash
# Ngrok'u indir ve kur
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Veya direkt binary indir
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

### 2. Ngrok API Key Ayarla

```bash
# Ngrok hesabından API key al: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
```

### 3. VPS'de Backend'i Ngrok ile Expose Et

```bash
# Backend Docker container'ı çalıştır
cd /path/to/backend
docker-compose up -d

# Ngrok tunnel başlat (port 8001)
ngrok http 8001

# Veya background'da çalıştır
nohup ngrok http 8001 > /tmp/ngrok.log 2>&1 &
```

### 4. Ngrok URL'ini Al

Ngrok başladıktan sonra şu URL'lerden birini al:
- Web Interface: `http://127.0.0.1:4040` (VPS'de)
- API: `curl http://127.0.0.1:4040/api/tunnels` (JSON response)

Örnek ngrok URL: `https://abc123.ngrok-free.app`

## Vercel Yapılandırması

### 1. Vercel Environment Variable Ekle

Vercel Dashboard'da:
1. Project Settings → Environment Variables
2. Yeni variable ekle:
   - **Name:** `EXPO_PUBLIC_API_URL`
   - **Value:** `https://your-ngrok-url.ngrok-free.app`
   - **Environment:** Production, Preview, Development (hepsini seç)

### 2. Vercel CLI ile (Alternatif)

```bash
cd app
vercel env add EXPO_PUBLIC_API_URL
# Value girerken: https://your-ngrok-url.ngrok-free.app
```

### 3. Otomatik Ngrok URL Güncelleme (Opsiyonel)

Ngrok URL'leri her restart'ta değişir. Otomatik güncelleme için:

```bash
# VPS'de script oluştur
cat > /path/to/update-ngrok-url.sh << 'EOF'
#!/bin/bash
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')
vercel env rm EXPO_PUBLIC_API_URL production --yes
vercel env add EXPO_PUBLIC_API_URL production
# URL'i manuel girmen gerekebilir
echo "Ngrok URL: $NGROK_URL"
EOF

chmod +x /path/to/update-ngrok-url.sh
```

## Ngrok Static Domain (Önerilen)

Ngrok URL'lerinin değişmemesi için static domain kullan:

### 1. Ngrok Dashboard'da Domain Al

1. https://dashboard.ngrok.com/domains → "Add a domain"
2. Domain al (örn: `inua-backend.ngrok-free.app`)

### 2. VPS'de Static Domain ile Başlat

```bash
ngrok http 8001 --domain=inua-backend.ngrok-free.app
```

### 3. Vercel'de Static URL Kullan

```env
EXPO_PUBLIC_API_URL=https://inua-backend.ngrok-free.app
```

## Systemd Service (Production)

Ngrok'u systemd service olarak çalıştır:

```bash
# /etc/systemd/system/ngrok.service
sudo nano /etc/systemd/system/ngrok.service
```

```ini
[Unit]
Description=Ngrok tunnel for InuaBreath backend
After=network.target

[Service]
Type=simple
User=your-user
ExecStart=/usr/local/bin/ngrok http 8001 --domain=inua-backend.ngrok-free.app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ngrok
sudo systemctl start ngrok
sudo systemctl status ngrok
```

## Troubleshooting

### Ngrok URL değişti

1. Vercel Dashboard'dan yeni URL'i güncelle
2. Veya static domain kullan

### CORS Hatası

Backend'de CORS zaten açık (`allow_origins=["*"]`), ama ngrok header'ları ekleyebilir:

```bash
ngrok http 8001 --request-header-add "Access-Control-Allow-Origin: *"
```

### Ngrok Rate Limit

Free plan'da rate limit var. Upgrade yap veya:
- Static domain kullan (daha az limit)
- VPS'de direkt domain kullan (en iyi çözüm)

## Production Önerisi

Ngrok yerine direkt domain kullanmak daha iyi:

1. VPS'de domain ayarla (örn: `api.inuabreath.com`)
2. Nginx reverse proxy kur
3. SSL sertifikası (Let's Encrypt)
4. Vercel'de domain URL kullan

```env
EXPO_PUBLIC_API_URL=https://api.inuabreath.com
```
