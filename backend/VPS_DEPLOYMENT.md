# VPS Deployment Rehberi

## 🚀 Hızlı Deployment

### Server'da Değişiklik Yaptıktan Sonra

```bash
# 1. VPS'e SSH ile bağlan
ssh user@your-vps-ip

# 2. Backend klasörüne git
cd /path/to/backend

# 3. Deploy script'ini çalıştır
./deploy-vps.sh
```

## 📋 Manuel Adımlar

### 1. Git Pull (Kod Güncellemeleri)

```bash
cd /path/to/backend
git pull origin main
```

### 2. Environment Variables Kontrol

```bash
# .env dosyasını kontrol et
cat .env

# Eğer yeni environment variable eklendiyse, .env'i güncelle
nano .env
```

### 3. Docker Container'ı Yeniden Başlat

```bash
# Seçenek 1: Sadece restart (kod değişikliği yoksa)
docker-compose restart

# Seçenek 2: Rebuild + restart (kod değişikliği varsa)
docker-compose down
docker-compose build
docker-compose up -d

# Seçenek 3: Tam rebuild (dependency değişikliği varsa)
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 4. Health Check

```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:8001/health

# Logları kontrol et
docker logs inua-breath-backend --tail 50
```

### 5. Ngrok Kontrol (Eğer Kullanıyorsan)

```bash
# Ngrok'un çalıştığını kontrol et
pgrep -f "ngrok http 8001"

# Ngrok URL'ini al
curl http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# Ngrok yeniden başlat (gerekirse)
pkill ngrok
nohup ngrok http 8001 --domain=loveliest-rayne-onwards.ngrok-free.dev > /tmp/ngrok.log 2>&1 &
```

## 🔄 Değişiklik Türlerine Göre

### Sadece Kod Değişikliği (server.py, vb.)

```bash
git pull
docker-compose restart
```

### requirements.txt Değişikliği

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### .env Değişikliği

```bash
# .env'i güncelle
nano .env

# Container'ı restart et (environment variable'ları yüklemek için)
docker-compose restart
```

### Dockerfile Değişikliği

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### all_db.json Upgrade (DB güncelleme)

Backend DB'yi sunucuda güncellemek için:

**1. Yeni dosyayı sunucuya al**

- **Git kullanıyorsan** (all_db.json repo’da):
  ```bash
  cd /path/to/backend   # backend klasörüne git
  git pull
  ```

- **Manuel kopyalıyorsan** (lokaldeki güncel `all_db.json`):
  ```bash
  scp backend/all_db.json user@SUNUCU_IP:/path/to/backend/all_db.json
  ```

**2. Container’ı yeniden başlat**

DB dosyası uygulama açılışında okunuyor; değişikliklerin geçerli olması için restart gerekir.

```bash
cd /path/to/backend
docker-compose restart
```

Volume mount kullanıyorsan (`./all_db.json:/app/all_db.json`) container yeni dosyayı bu restart ile okur. Volume yoksa image’ı yeniden build edip up etmen gerekir:

```bash
docker-compose down
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Container Başlamıyor

```bash
# Logları kontrol et
docker logs inua-breath-backend

# Container'ı sil ve yeniden oluştur
docker-compose down
docker-compose up -d
```

### Port Çakışması

```bash
# Port 8001'i kullanan process'i bul
sudo lsof -i :8001

# Process'i durdur
sudo kill -9 <PID>
```

### Ngrok URL Değişti

```bash
# Yeni URL'i al
curl http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# Vercel'de environment variable'ı güncelle
# Vercel Dashboard → Environment Variables → EXPO_PUBLIC_API_URL
```

## 📝 Otomatik Deployment (GitHub Actions - Opsiyonel)

`.github/workflows/deploy-vps.yml` oluştur:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /path/to/backend
            git pull origin main
            docker-compose down
            docker-compose build
            docker-compose up -d
```

## 🔐 Güvenlik Notları

1. **.env dosyasını git'e commit etme**
2. **SSH key'leri güvenli tut**
3. **Firewall kurallarını kontrol et** (sadece gerekli portlar açık)
4. **Ngrok authtoken'ı güvenli sakla**

## 📊 Monitoring

```bash
# Container durumu
docker ps

# Resource kullanımı
docker stats inua-breath-backend

# Logları takip et
docker logs -f inua-breath-backend
```
