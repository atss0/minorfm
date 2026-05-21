# MINOR.fm Production Deployment

> Son güncelleme: 2026-05-21

## Mimari

```
İnternet (80/443)
        │
        ▼
Nginx Proxy Manager   (Docker — proxy network)
        ├── minor.fm       ──► web:3000   (Next.js)
        └── api.minor.fm   ──► api:8080   (Go + Fiber)
                                   │
                       ┌───────────┴───────────┐
                       ▼                       ▼
              postgres:5432           redis:6379
              (backend network — dışarıya port açık değil)
```

---

## 1. VDS Gereksinimleri

| Özellik         | Minimum (test)   | Önerilen (prod)   |
|-----------------|------------------|-------------------|
| vCPU            | 2                | 4                 |
| RAM             | 4 GB             | 8 GB              |
| Disk            | 40 GB SSD NVMe   | 80 GB SSD NVMe    |
| İşletim Sistemi | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS  |
| Bant Genişliği  | 1 Gbps           | 1 Gbps            |

> Hetzner CX22 (2 vCPU, 4 GB RAM, 40 GB NVMe, ~4 €/ay) test için yeterli.

---

## 2. Değiştirilen / Oluşturulan Dosyalar

| Dosya                       | Değişiklik                                      |
|-----------------------------|-------------------------------------------------|
| `web/Dockerfile`            | `NEXT_PUBLIC_WS_URL` build arg eklendi          |
| `docker-compose.prod.yml`   | Yeni — tüm prod servislerini içerir (NPM dahil) |
| `backend/.env.prod.example` | Yeni — prod env şablonu (commit edilir)         |
| `backend/.env.prod`         | VDS'de elle oluşturulur, **asla commit edilmez**|

---

## 3. DNS Ayarları

Domain sağlayıcının panelinde şu A kayıtlarını oluştur:

```
A    minor.fm         <VDS_IP_ADRESI>
A    api.minor.fm     <VDS_IP_ADRESI>
A    www.minor.fm     <VDS_IP_ADRESI>    (opsiyonel)
```

> DNS yayılması 1–24 saat sürebilir.
> Kontrol: `dig +short minor.fm` — VDS IP'si dönmeli.

---

## 4. VDS Kurulumu

### 4.1 Sistem Güncelleme

```bash
apt update && apt upgrade -y
apt install -y git curl ufw
```

### 4.2 Güvenlik Duvarı (UFW)

```bash
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP  (Let's Encrypt doğrulaması için şart)
ufw allow 443/tcp    # HTTPS
ufw allow 81/tcp     # NPM admin paneli (kurulumdan sonra kapatılacak)
ufw enable
```

### 4.3 Docker Kurulumu

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

---

## 5. Proje Kurulumu

### 5.1 Repo'yu Klonla

```bash
cd /opt
git clone https://github.com/KULLANICI/minor.fm.git
cd minor.fm
```

### 5.2 Production .env Dosyasını Oluştur

```bash
cp backend/.env.prod.example backend/.env.prod
nano backend/.env.prod
```

Doldurulacak değerler:

```env
APP_URL=https://minor.fm
PORT=8080
ALLOWED_ORIGINS=https://minor.fm

# Üretmek için: openssl rand -hex 32
JWT_SECRET=BURAYA_YAPISTIR

POSTGRES_PASSWORD=GUCLU_BIR_SIFRE_YAZ

# R2 ve Resend değerlerini local .env'den kopyala (aynı kalır)
R2_ACCOUNT_ID=05ee2d337184fce08535e2f855e12554
R2_ENDPOINT=https://05ee2d337184fce08535e2f855e12554.r2.cloudflarestorage.com
R2_BUCKET_NAME=minorfm
R2_PUBLIC_URL=https://pub-095abdad53b3433a95bfc89aabcb0571.r2.dev
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

RESEND_API_KEY=...
RESEND_FROM=MINOR.fm <noreply@minor.fm>
```

JWT secret üretmek için:

```bash
openssl rand -hex 32
```

### 5.3 Servisleri Başlat

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env.prod up -d --build
```

İlk build **5–10 dakika** sürebilir (Go derlemesi + Next.js build).

### 5.4 Durumu Kontrol Et

```bash
docker compose -f docker-compose.prod.yml ps
```

Beklenen çıktı:

```
NAME                    STATUS
minorfm-npm-1           running
minorfm-postgres-1      healthy
minorfm-redis-1         healthy
minorfm-api-1           healthy
minorfm-web-1           running
```

---

## 6. Nginx Proxy Manager (NPM) Kurulumu

### 6.1 İlk Giriş

Tarayıcıda `http://VDS_IP:81` adresini aç.

```
E-posta : admin@example.com
Şifre   : changeme
```

Giriş sonrası yeni e-posta ve şifre ister — hemen değiştir.

---

### 6.2 minor.fm — Web Frontend (Next.js)

**Dashboard → Proxy Hosts → Add Proxy Host**

**Details sekmesi:**

| Alan                  | Değer                       |
|-----------------------|-----------------------------|
| Domain Names          | `minor.fm` ve `www.minor.fm`|
| Scheme                | `http`                      |
| Forward Hostname/IP   | `web`                       |
| Forward Port          | `3000`                      |
| Cache Assets          | Off                         |
| Block Common Exploits | On                          |
| Websockets Support    | Off                         |

**SSL sekmesi:**

| Alan                | Değer                             |
|---------------------|-----------------------------------|
| SSL Certificate     | Request a new SSL Certificate     |
| Force SSL           | On                                |
| HTTP/2 Support      | On                                |
| Let's Encrypt Email | hangarrecordz@gmail.com           |
| I Agree to the ToS  | İşaretli                          |

→ **Save**

---

### 6.3 api.minor.fm — Go API + WebSocket

**Dashboard → Proxy Hosts → Add Proxy Host**

**Details sekmesi:**

| Alan                  | Değer                        |
|-----------------------|------------------------------|
| Domain Names          | `api.minor.fm`               |
| Scheme                | `http`                       |
| Forward Hostname/IP   | `api`                        |
| Forward Port          | `8080`                       |
| Cache Assets          | Off                          |
| Block Common Exploits | On                           |
| Websockets Support    | **On** ← Chat/radio için şart|

**SSL sekmesi:**

| Alan                | Değer                             |
|---------------------|-----------------------------------|
| SSL Certificate     | Request a new SSL Certificate     |
| Force SSL           | On                                |
| HTTP/2 Support      | On                                |
| Let's Encrypt Email | hangarrecordz@gmail.com           |
| I Agree to the ToS  | İşaretli                          |

→ **Save**

---

### 6.4 NPM Admin Portunu Kapat

SSL sertifikaları başarıyla alındıktan sonra:

```bash
ufw delete allow 81/tcp
ufw reload
```

> NPM admin paneline tekrar erişmek gerekirse:
> `ufw allow 81/tcp` → işin bitti → `ufw delete allow 81/tcp`

---

## 7. Doğrulama

```bash
# Web frontend
curl -I https://minor.fm

# API sağlık kontrolü
curl https://api.minor.fm/health

# API temel endpoint
curl https://api.minor.fm/api/posts
```

---

## 8. Admin Kullanıcı Oluşturma

İlk kullanıcıyı `/api/auth/register` ile oluştur, ardından admin yap:

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env.prod exec postgres \
  psql -U postgres minorfm \
  -c "UPDATE users SET role='admin' WHERE email='hangarrecordz@gmail.com';"
```

---

## 9. Güncelleme (Yeni Sürüm Deploy)

```bash
cd /opt/minor.fm
git pull
docker compose -f docker-compose.prod.yml --env-file backend/.env.prod up -d --build api web
```

> `postgres` ve `redis` servisleri yeniden başlatılmaz — veriler korunur.
> Sadece `api` ve `web` yeniden derlenir (~3-5 dk).

---

## 10. Yararlı Komutlar

```bash
# Tüm servis logları (canlı)
docker compose -f docker-compose.prod.yml logs -f

# Belirli servis logları
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f npm

# Servis yeniden başlat (rebuild olmadan)
docker compose -f docker-compose.prod.yml restart api

# Tüm servisleri durdur (veriler korunur)
docker compose -f docker-compose.prod.yml down

# Tüm servisleri durdur + volume'ları sil (VERİLER SİLİNİR!)
docker compose -f docker-compose.prod.yml down -v

# PostgreSQL'e bağlan
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres minorfm

# Redis'e bağlan
docker compose -f docker-compose.prod.yml exec redis redis-cli
```

---

## 11. Yedekleme

### PostgreSQL Yedek Al

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres minorfm > backup-$(date +%Y%m%d).sql
```

### PostgreSQL Yedeği Geri Yükle

```bash
cat backup-20260521.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres minorfm
```

---

## 12. Sorun Giderme

### API başlamıyor

```bash
docker compose -f docker-compose.prod.yml logs api
```

- `.env.prod` dosyasında eksik veya yanlış değer
- PostgreSQL henüz hazır değil (depends_on healthcheck bekliyor, ~15-20 sn)

### SSL sertifikası alınamıyor

- DNS henüz yayılmamış: `dig +short api.minor.fm` → VDS IP dönmeli
- 80 portu kapalı: `ufw status` ile kontrol et
- Let's Encrypt rate limit: aynı domain için 1 haftada 5 deneme hakkı var

### Web açılıyor ama API'ye bağlanamıyor

- NPM'de `api.minor.fm` proxy host'unda **Websockets Support** açık olmalı
- CORS hatası: `ALLOWED_ORIGINS` değerini kontrol et (`https://minor.fm`)

### "502 Bad Gateway"

```bash
docker compose -f docker-compose.prod.yml ps
# api ve web "healthy"/"running" olana kadar bekle
```

---

## 13. Bilinen Sorunlar

### Kritik

| # | Sorun | Dosya | Çözüm |
|---|-------|-------|-------|
| 1 | `backend/.env` git'e commit edilmiş (gerçek secret içeriyor) | `backend/.env` | Secret'ları rotate et, `.gitignore`'a ekle |
| 2 | JWT secret varsayılan değer hardcoded | `config/config.go:37` | `.env.prod`'da mutlaka override et |

### Yüksek Öncelik

| # | Sorun | Dosya | Çözüm |
|---|-------|-------|-------|
| 3 | WebSocket auth query param ile (`?token=`), access loglarında token görünür | `router/router.go:161` | WS protokolüne taşı veya log masking ekle |
| 4 | GORM auto-migrate production'da tehlikeli | `database/postgres.go` | `golang-migrate` ekle |
| 5 | Swagger UI public erişime açık | `router/router.go:79` | IP kısıtla veya NPM'de basic auth ekle |

### Orta Öncelik

| # | Sorun | Çözüm |
|---|-------|-------|
| 6 | Sentry / hata izleme yok | Sentry Go SDK + Next.js ekle |
| 7 | Veritabanı yedekleme otomasyonu yok | Cron `pg_dump` + R2'ye upload |
| 8 | Uptime monitoring yok | UptimeRobot veya Cloudflare Health Checks |

---

## 14. Çalışma Ortamı Özeti

| Servis   | Local                                              | Production                          |
|----------|----------------------------------------------------|-------------------------------------|
| Backend  | `cd backend && go run ./cmd/api`                   | Docker — `api:8080`                 |
| Web      | `cd web && npm run dev`                            | Docker — `web:3000`                 |
| DB       | `docker compose -f backend/docker-compose.yml up`  | `docker-compose.prod.yml` volume    |
| Redis    | `docker compose -f backend/docker-compose.yml up`  | `docker-compose.prod.yml` volume    |
| Proxy    | —                                                  | Nginx Proxy Manager — `npm:80/443`  |
