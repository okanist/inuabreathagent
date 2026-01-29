# GitHub Actions Deployment

## Setup

### 1. GitHub Secrets Ayarla

GitHub repo'da **Settings → Secrets and variables → Actions** bölümüne git ve şu secret'ları ekle:

- **VPS_HOST**: `152.53.231.1` (VPS IP adresi)
- **VPS_USER**: `okan` (SSH kullanıcı adı)
- **VPS_SSH_KEY**: SSH private key (VPS'e erişim için)

### 2. SSH Key Oluşturma (Eğer yoksa)

```bash
# Yeni SSH key oluştur
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Public key'i VPS'e ekle
ssh-copy-id -i ~/.ssh/github_actions.pub okan@152.53.231.1

# Private key'i GitHub Secrets'a ekle
cat ~/.ssh/github_actions
# Çıktıyı kopyala ve VPS_SSH_KEY secret'ına yapıştır
```

### 3. VPS'te İlk Kurulum

VPS'te ilk kez:

```bash
cd ~
git clone https://github.com/okanist/inuabreathagent.git inua-breath-backend
cd inua-breath-backend/backend

# .env dosyasını oluştur
cp .env.example .env
nano .env  # API key'lerini gir

# Docker container'ları başlat
docker compose up -d
```

## Kullanım

Her `backend/` klasöründe değişiklik yapıp `main` branch'ine push yaptığında:

1. GitHub Actions otomatik çalışır
2. VPS'e SSH ile bağlanır
3. Git pull yapar
4. Docker container'ları rebuild eder
5. Container'ları yeniden başlatır

## Monitoring

- GitHub Actions sekmesinde deployment durumunu görebilirsin
- VPS'te logları kontrol et: `docker compose logs -f`

## Troubleshooting

### SSH Connection Failed
- SSH key'in doğru olduğundan emin ol
- VPS firewall'unda port 22 açık mı kontrol et

### Git Pull Failed
- VPS'te git repository var mı kontrol et
- İlk kurulum adımlarını yap

### Docker Build Failed
- VPS'te Docker ve Docker Compose kurulu mu kontrol et
- Disk alanı yeterli mi kontrol et

### Health Check Failed
- Container loglarını kontrol et: `docker compose logs`
- Port 8001 kullanımda mı kontrol et: `sudo lsof -i :8001`
