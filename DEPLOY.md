# MINOR.fm — VDS Deployment Planı

## İçerik

1. [VDS Seçimi ve Maliyet](#1-vds-seçimi-ve-maliyet)
2. [Harici Servisler](#2-harici-servisler)
3. [Domain ve DNS Ayarı](#3-domain-ve-dns-ayarı)
4. [Sunucu İlk Kurulum](#4-sunucu-ilk-kurulum)
5. [Docker Kurulumu](#5-docker-kurulumu)
6. [Proje Dosyalarını Sunucuya Taşıma](#6-proje-dosyalarını-sunucuya-taşıma)
7. [Next.js Dockerfile Ekleme](#7-nextjs-dockerfile-ekleme)
8. [Docker Compose Güncelleme](#8-docker-compose-güncelleme)
9. [Environment Variables (.env)](#9-environment-variables-env)
10. [Nginx Kurulum ve Konfigürasyonu](#10-nginx-kurulum-ve-konfigürasyonu)
11. [SSL Sertifikası (Let's Encrypt)](#11-ssl-sertifikası-lets-encrypt)
12. [Uygulamayı Başlatma](#12-uygulamayı-başlatma)
13. [Güncelleme Akışı](#13-güncelleme-akışı)
14. [Temel İzleme ve Loglar](#14-temel-izleme-ve-loglar)
15. [Sorun Giderme](#15-sorun-giderme)

---

## 1. VDS Seçimi ve Maliyet

### Önerilen Sunucu: Hetzner CX22

| Özellik | CX22 (Başlangıç) | CX32 (Büyüme) |
|---------|-----------------|---------------|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| Aylık Trafik | 20 TB | 20 TB |
| Fiyat | ~€4.51/ay | ~€7.49/ay |
| Bölge | Falkenstein (DE) | Falkenstein (DE) |

> **Neden Hetzner?** Fiyat/performans açısından piyasanın en iyisi. Türkiye'ye latency iyi (30-50ms). DigitalOcean ve Linode'dan 3-4x ucuz.

### Başlangıç için CX22 yeterli mi?

Evet. Go binary çok az bellek kullanır (~30-50 MB). PostgreSQL + Redis + Go API + Next.js toplam ~1-1.5 GB RAM tutar. 4 GB fazlasıyla yeter.

### İşletim Sistemi

**Ubuntu 22.04 LTS** — Hetzner panelinden seçilir, stabil ve yaygın.

---

## 2. Harici Servisler

Bunları sunucu kurmadan önce hazır etmen gerekiyor.

### Cloudflare R2 (Medya Depolama)

Görseller R2'ye yükleniyor. Sunucuda disk dolmaz.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage** → **Create bucket**
2. Bucket adı: `minorfm`
3. **Manage R2 API Tokens** → **Create API token** (Object Read & Write izni)
4. Notları al: `Account ID`, `Access Key ID`, `Secret Access Key`
5. Bucket → **Settings** → **Custom Domain** veya R2 dev URL'ini al (`pub-xxx.r2.dev`)

> **Maliyet:** İlk 10 GB ücretsiz, sonrası $0.015/GB. Küçük bir topluluk için uzun süre ücretsiz.

### SMTP (E-posta / Şifre Sıfırlama)

Tavsiye: **Resend** (resend.com) — aylık 3.000 ücretsiz e-posta, modern API.

Alternatif: SendGrid (ücretsiz 100/gün) veya Brevo.

1. [resend.com](https://resend.com) → **API Keys** → Create
2. Domain doğrulama: DNS'e birkaç TXT/MX kaydı ekleyecek
3. SMTP bilgileri:
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: API key

### Domain

Cloudflare DNS kullanmanı tavsiye ederim (ücretsiz CDN + proxy + DDoS koruması).

---

## 3. Domain ve DNS Ayarı

Cloudflare'e domain ekledikten sonra:

```
Type    Name     Value              Proxy
A       @        <VDS_IP>           ON (turuncu bulut)
A       www      <VDS_IP>           ON (turuncu bulut)
```

> Cloudflare proxy (turuncu bulut) açık olursa gerçek IP gizlenir ve SSL/CDN otomatik çalışır. WebSocket için **Network → WebSockets → ON** ayarını aç.

---

## 4. Sunucu İlk Kurulum

Hetzner panelinden sunucuyu oluşturunca SSH bağlantı bilgilerini e-posta ile alırsın.

```bash
# Sunucuya bağlan
ssh root@<VDS_IP>

# Sistemi güncelle
apt update && apt upgrade -y

# Temel araçlar
apt install -y curl git ufw fail2ban unzip

# Güvenlik duvarı
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Root yerine sudo kullanıcısı oluştur (isteğe bağlı ama tavsiye edilir)
adduser minorfm
usermod -aG sudo minorfm

# SSH key'ini yeni kullanıcıya kopyala
rsync --archive --chown=minorfm:minorfm ~/.ssh /home/minorfm
```

Bundan sonra `ssh minorfm@<VDS_IP>` ile bağlanabilirsin.

---

## 5. Docker Kurulumu

```bash
# Docker resmi kurulum scripti
curl -fsSL https://get.docker.com | sh

# Kullanıcıyı docker grubuna ekle (sudo gerektirmemesi için)
sudo usermod -aG docker $USER

# Çıkıp tekrar gir veya:
newgrp docker

# Test
docker run hello-world
docker compose version
```

---

## 6. Proje Dosyalarını Sunucuya Taşıma

### Seçenek A: GitHub (Önerilen)

Projeyi GitHub'a push'la, sunucuda clone'la.

```bash
# Sunucuda
git clone https://github.com/KULLANICI/minor.fm.git /opt/minorfm
cd /opt/minorfm
```

### Seçenek B: Direkt Kopyalama (Hızlı Test İçin)

```bash
# Kendi bilgisayarında — projeyi sunucuya kopyala
scp -r C:\Users\ats\Desktop\projects\minor.fm minorfm@<VDS_IP>:/opt/minorfm
```

---

## 7. Next.js Dockerfile Ekleme

`web/Dockerfile` dosyası oluştur:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

`next.config.mjs` zaten `output: 'standalone'` içeriyor, ekstra bir şey gerekmez.

---

## 8. Docker Compose Güncelleme

`backend/docker-compose.yml` dosyasını aşağıdaki gibi güncelle — `web` servisi ekle:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: minorfm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - minorfm_net

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - minorfm_net

  api:
    build: .
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/minorfm?sslmode=disable
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - minorfm_net

  web:
    build:
      context: ../web
      dockerfile: Dockerfile
      args:
        # Domain aynı olduğu için API aynı origin'den /api/* ile erişilebilir
        NEXT_PUBLIC_API_URL: https://minor.fm
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - api
    networks:
      - minorfm_net

volumes:
  pgdata:
  redisdata:

networks:
  minorfm_net:
    driver: bridge
```

> **Not:** `ports` kısmında `5432` ve `6379`'u dışarıya açmak kaldırıldı — bunlar sadece container ağı içinde erişilebilir olmalı.

---

## 9. Environment Variables (.env)

`backend/.env` dosyasını oluştur (`.env.example` şablonu var):

```bash
cd /opt/minorfm/backend
cp .env.example .env
nano .env
```

Doldurulacak değerler:

```env
# Güçlü bir şifre — küçük/büyük harf + rakam + sembol
POSTGRES_PASSWORD=BurayayazGucluBirSifre123!

DATABASE_URL=postgres://postgres:BurayayazGucluBirSifre123!@postgres:5432/minorfm?sslmode=disable

REDIS_URL=redis://redis:6379

# openssl rand -hex 32 ile üret
JWT_SECRET=üretilen_64_karakterlik_hex

PORT=8080
ALLOWED_ORIGINS=https://minor.fm,https://www.minor.fm
APP_URL=https://minor.fm

# Cloudflare R2
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=minorfm
R2_PUBLIC_URL=https://pub-XXXXXXXX.r2.dev

# SMTP (Resend kullanıyorsan)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_FROM=noreply@minor.fm
SMTP_PASSWORD=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

JWT_SECRET üretmek için:
```bash
openssl rand -hex 32
```

---

## 10. Nginx Kurulum ve Konfigürasyonu

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

`/etc/nginx/sites-available/minorfm` dosyasını oluştur:

```nginx
# HTTP → HTTPS yönlendirmesi
server {
    listen 80;
    server_name minor.fm www.minor.fm;
    return 301 https://$host$request_uri;
}

# Ana HTTPS server
server {
    listen 443 ssl;
    server_name minor.fm www.minor.fm;

    # SSL — Certbot bu satırları otomatik doldurur
    ssl_certificate     /etc/letsencrypt/live/minor.fm/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minor.fm/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Yükleme boyutu limiti (medya yükleme için)
    client_max_body_size 20M;

    # WebSocket endpointleri (/ws/*)
    location /ws/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Go API (/api/*)
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Swagger (isteğe bağlı — production'da kapatabilirsin)
    location /swagger/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }

    # Next.js (geri kalan her şey)
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        # Next.js HMR WebSocket (gerekli)
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

Aktif et ve test et:

```bash
sudo ln -s /etc/nginx/sites-available/minorfm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. SSL Sertifikası (Let's Encrypt)

> **Cloudflare kullanıyorsan:** Cloudflare proxy (turuncu bulut) açıksa SSL zaten Cloudflare tarafından halledilir. Certbot gerekmeyebilir; Cloudflare → SSL/TLS → **Full (strict)** modunu seç ve Nginx'te self-signed sertifika kullan. Ama aşağıdaki Certbot yolu daha basit.

```bash
sudo apt install -y certbot python3-certbot-nginx

# Sertifika al (Nginx'i otomatik yapılandırır)
sudo certbot --nginx -d minor.fm -d www.minor.fm

# Otomatik yenilemeyi test et
sudo certbot renew --dry-run
```

Certbot, yukarıdaki Nginx konfigürasyonundaki `ssl_certificate` satırlarını otomatik doldurur.

---

## 12. Uygulamayı Başlatma

```bash
cd /opt/minorfm/backend

# İlk build ve başlatma
docker compose up -d --build

# Container durumunu kontrol et
docker compose ps

# Logları izle (ilk başlatmada DB migration vs.)
docker compose logs -f api
docker compose logs -f web
```

Başarılı çıktı şuna benzer:
```
api   | {"level":"info","msg":"Server started on :8080"}
web   | ▲ Next.js 16.x
web   | - Local: http://localhost:3000
web   | ✓ Ready in 2.1s
```

Tarayıcıda `https://minor.fm` aç — site çalışıyor olmalı.

---

## 13. Güncelleme Akışı

Kod değişikliği yaptıktan sonra sunucuya deploy etmek için:

```bash
# Sunucuda
cd /opt/minorfm

# GitHub'dan son değişiklikleri çek
git pull

# Sadece backend değiştiyse
docker compose -f backend/docker-compose.yml up -d --build api

# Sadece frontend değiştiyse
docker compose -f backend/docker-compose.yml up -d --build web

# İkisi de değiştiyse
docker compose -f backend/docker-compose.yml up -d --build api web
```

> **Not:** `--build` bayrağı olmadan `up -d` container'ı yeniden build etmez, sadece yeniden başlatır. Kod değişikliklerinin yansıması için `--build` şart.

### Sıfır-downtime için (ileri seviye)

Şimdilik gerek yok ama büyürse: Nginx `upstream` bloğu + iki API container arasında rolling restart.

---

## 14. Temel İzleme ve Loglar

### Anlık log izleme

```bash
# Tüm servisler
docker compose -f /opt/minorfm/backend/docker-compose.yml logs -f

# Sadece API
docker compose -f /opt/minorfm/backend/docker-compose.yml logs -f api

# Son 100 satır
docker compose -f /opt/minorfm/backend/docker-compose.yml logs --tail=100 api
```

### Sistem kaynakları

```bash
# CPU/RAM kullanımı
docker stats

# Disk
df -h
```

### Nginx logları

```bash
# Erişim logları
sudo tail -f /var/log/nginx/access.log

# Hata logları
sudo tail -f /var/log/nginx/error.log
```

### Cron ile otomatik yeniden başlatma (isteğe bağlı)

```bash
# Haftada bir pazar gece yarısı container'ları yeniden başlat
crontab -e
# Şunu ekle:
0 0 * * 0 cd /opt/minorfm/backend && docker compose restart api web
```

---

## 15. Sorun Giderme

### Site açılmıyor

```bash
# Container'lar çalışıyor mu?
docker compose -f /opt/minorfm/backend/docker-compose.yml ps

# Nginx çalışıyor mu?
sudo systemctl status nginx

# Port dinleniyor mu?
sudo ss -tlnp | grep -E '80|443|3000|8080'
```

### API 502 Bad Gateway

```bash
# API container logları
docker compose -f /opt/minorfm/backend/docker-compose.yml logs api

# Container içinde manuel test
docker exec -it backend-api-1 wget -qO- http://localhost:8080/health
```

### Veritabanı bağlanamıyor

```bash
# PostgreSQL logları
docker compose -f /opt/minorfm/backend/docker-compose.yml logs postgres

# Manuel bağlantı testi
docker exec -it backend-postgres-1 psql -U postgres -d minorfm -c "\dt"
```

### Disk doldu

```bash
# Kullanılmayan Docker katmanlarını temizle
docker system prune -af --volumes

# En çok yer kaplayan dizinler
du -sh /opt/minorfm /var/lib/docker /var/log
```

### WebSocket bağlanamıyor

Cloudflare kullanıyorsan: **Cloudflare Dashboard → Network → WebSockets → Enabled** olduğunu doğrula.

---

## Özet: Tahmini Toplam Maliyet

| Servis | Plan | Maliyet |
|--------|------|---------|
| Hetzner CX22 VDS | Başlangıç | ~€4.51/ay |
| Cloudflare R2 | <10 GB | Ücretsiz |
| Cloudflare DNS/CDN | Free tier | Ücretsiz |
| Resend SMTP | <3.000 e-posta/ay | Ücretsiz |
| Domain (.fm) | Yıllık | ~$35/yıl |
| **Toplam** | | **~€4.51/ay + domain** |

---

*Son güncelleme: Mayıs 2026*
