# Sunucuya Yüklenecek Dosyalar

## ✅ Gerekli Dosyalar (MUTLAKA)

```
backend/
├── server.py                    # Ana uygulama
├── requirements.txt             # Python bağımlılıkları
├── breathing_db.json            # Nefes teknikleri veritabanı
├── Dockerfile                   # Docker build dosyası
├── docker-compose.yml           # Docker Compose yapılandırması (opsiyonel ama önerilir)
├── .dockerignore               # Docker ignore dosyası
└── .env.example                # Environment variables şablonu
```

## 📁 Opsiyonel Dosyalar (İstersen)

```
backend/
└── eval/                        # Evaluation sistemi (Opik için)
    ├── golden_inua.jsonl
    └── run_eval.py
```

## ❌ YÜKLEME (Gereksiz Dosyalar)

```
backend/
├── test_*.py                   # Test dosyaları
├── *.log                       # Log dosyaları
├── __pycache__/                # Python cache
├── server_debug.log
├── debug_*.ps1
├── simple_check.py
├── temp_result.txt
└── README*.md                  # Dokümantasyon (opsiyonel)
```

## 🚀 Hızlı Kopyalama Komutu (Linux/Mac)

Sunucuda çalıştır:

```bash
# Sadece gerekli dosyaları kopyala
scp -r backend/server.py backend/requirements.txt backend/breathing_db.json \
     backend/Dockerfile backend/docker-compose.yml backend/.dockerignore \
     backend/.env.example user@server:/path/to/backend/

# Veya tüm backend klasörünü kopyala, sonra gereksizleri sil
scp -r backend/ user@server:/path/to/
ssh user@server "cd /path/to/backend && rm -f test_*.py *.log debug_*.ps1 simple_check.py temp_result.txt && rm -rf __pycache__"
```

## 📝 Sunucuda Yapılacaklar

1. `.env` dosyası oluştur:
```bash
cd /path/to/backend
cp .env.example .env
nano .env  # API key'lerini gir
```

2. Docker ile çalıştır:
```bash
docker-compose up -d
```

## ✅ Minimum Dosya Listesi (Sadece Docker için)

Eğer sadece Docker ile çalıştıracaksan, minimum şunlar yeterli:

```
backend/
├── server.py
├── requirements.txt
├── breathing_db.json
├── Dockerfile
└── .env (sunucuda oluşturulacak)
```
