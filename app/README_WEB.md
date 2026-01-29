# Web'de Çalıştırma Rehberi

## Hızlı Başlangıç

### 1. Environment Variable Ayarla

`.env` dosyası oluştur (veya mevcut olanı düzenle):

```bash
cd app
cp .env.example .env
```

`.env` dosyasını düzenle:
```env
# Local development için
EXPO_PUBLIC_API_URL=http://localhost:8001

# Production için (sunucu IP veya domain)
# EXPO_PUBLIC_API_URL=http://your-server-ip:8001
# EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Dependencies Yükle (İlk Kez)

```bash
cd app
npm install
```

### 3. Web'de Çalıştır

```bash
# Development mode (hot reload)
npm run web

# Veya direkt
npx expo start --web
```

Uygulama otomatik olarak tarayıcıda açılacak: `http://localhost:8081`

## Production Build

### Static Export (Vercel/Netlify için)

```bash
cd app
npx expo export:web
```

Çıktı: `web-build/` klasörü

### Vercel'e Deploy

```bash
# Vercel CLI ile
vercel

# Veya GitHub'dan otomatik deploy
# vercel.json zaten mevcut
```

## Backend Bağlantısı

### Local Development
- Backend: `http://localhost:8001`
- Frontend: `http://localhost:8081`

### Production
- Backend: Docker container'da çalışıyor (örn: `http://your-server-ip:8001`)
- Frontend: Vercel'de veya başka bir hosting'de

## CORS Ayarları

Backend'de CORS zaten açık (`allow_origins=["*"]`), web'den direkt erişebilirsiniz.

## Troubleshooting

### Backend'e bağlanamıyorum
1. Backend'in çalıştığından emin ol: `curl http://localhost:8001/health`
2. `.env` dosyasında `EXPO_PUBLIC_API_URL` doğru mu kontrol et
3. CORS hatası varsa, backend'de `allow_origins` kontrol et

### Port çakışması
```bash
# Farklı port kullan
npx expo start --web --port 3000
```

### Build hatası
```bash
# Cache temizle
rm -rf node_modules .expo web-build
npm install
npx expo start --web --clear
```
