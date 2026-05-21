# MINOR.fm — Admin Panel Yapılacaklar Listesi

> Mevcut durum: Backend'de `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `DELETE /api/admin/posts/:id`, kategori CRUD ve davet endpoint'leri var. Frontend'de yalnızca `/admin/invites` sayfası mevcut.

---

## 1. Backend — Eksik Endpoint'ler

### 1.1 Dashboard İstatistikleri
- [x] `GET /api/admin/stats` — toplam kullanıcı, post, yorum, aktif davet sayısı; son 7/30 günlük kayıt ve içerik sayıları

### 1.2 Kullanıcı Yönetimi (Eksikler)
- [x] `DELETE /api/admin/users/:id` — kullanıcıyı kalıcı sil (soft delete, GORM `DeletedAt`) — sadece admin
- [x] `POST /api/admin/users/:id/ban` — geçici veya kalıcı ban (ban bitiş tarihi, ban nedeni)
- [x] `DELETE /api/admin/users/:id/ban` — ban kaldır
- [x] `GET /api/admin/users?q=&role=&page=` — arama + rol filtresi + sayfalama (mevcut handler güncellendi)

### 1.3 Post / İçerik Yönetimi (Eksikler)
- [x] `GET /api/admin/posts?q=&user=&category=&type=&page=` — admin içerik listesi (filtre + arama)
- [x] `PUT /api/admin/posts/:id/pin` — postu sabitle / sabitlemeyi kaldır (toggle)

### 1.4 Yorum Yönetimi
- [x] `GET /api/admin/comments?post_id=&user_id=&page=` — tüm yorumları listele
- [x] `DELETE /api/admin/comments/:id` — yorum sil (moderatör yetkisiyle)

### 1.5 Kategori Yönetimi (Eksikler)
- [x] `DELETE /api/admin/categories/:id` — kategori sil (altında post varsa hata dön)

### 1.6 Radyo / Parça Yönetimi (Eksikler)
- [x] `GET /api/admin/radio/tracks` — mevcut public endpoint (`GET /api/radio/queue`) kullanılıyor
- [x] `DELETE /api/admin/radio/tracks/:id` — parçayı sil
- [x] `PUT /api/admin/radio/tracks/:id/order` — parça sıralamasını güncelle
- [x] `POST /api/admin/radio/skip` — şu anki parçayı atla (scheduler'a komut gönder)

### 1.7 Duyuru / Pin Sistemi (Opsiyonel)
- [x] `Announcement` modeli: id, body, url, active, expires_at
- [x] `POST /api/admin/announcements` — duyuru oluştur
- [x] `PUT /api/admin/announcements/:id` — duyuruyu güncelle / devre dışı bırak
- [x] `GET /api/announcements/active` — frontend banner için aktif duyuruyu getir (public)

---

## 2. Frontend — Admin Layout & Route Koruması

### 2.1 Admin Route Yapısı
- [x] `app/(admin)/layout.tsx` — yeni route grubu; AppShell'den **bağımsız** (sohbet, radyo oynatıcı olmadan)
- [x] Admin layout: sol sidebar (nav linkleri) + üst bar (breadcrumb, "Siteye Dön" butonu)
- [x] `middleware.ts` güncellemesi: `role !== 'admin' && role !== 'moderator'` → `/` yönlendirmesi (mevcut `logged_in` cookie'sine ek olarak rol kontrolü)
- [x] `components/admin/AdminShell.tsx` — rol kontrolü yapan client wrapper (Zustand `authStore`)

### 2.2 Admin Sol Sidebar Navigasyon
- [x] Dashboard linki
- [x] Kullanıcılar linki
- [x] İçerikler linki
- [x] Yorumlar linki
- [x] Kategoriler linki
- [x] Radyo linki
- [x] Davetler linki (mevcut `InvitesView` buraya taşınacak)
- [x] Aktif sayfayı `pathname` ile highlight et

---

## 3. Frontend — Sayfalar

### 3.1 Dashboard — `/admin`
- [x] İstatistik kartları: Toplam Kullanıcı / Post / Yorum / Aktif Davet
- [x] "Son 7 gün" / "Son 30 gün" toggle
- [x] Son kayıt olan kullanıcılar listesi (5 satır, username + tarih)
- [x] Son eklenen postlar listesi (5 satır, başlık + kullanıcı)
- [x] Skeleton yükleme durumu

### 3.2 Kullanıcı Yönetimi — `/admin/users`
- [x] Arama inputu (username, email)
- [x] Rol filtresi: Hepsi / Kullanıcı / Moderatör / Admin
- [x] Tablo: Avatar · Kullanıcı adı · Email · Rol · Kayıt tarihi · Aksiyonlar
- [x] Satır aksiyonları:
  - [x] Rol değiştir (dropdown — `PUT /api/admin/users/:id/role`)
  - [x] Profili görüntüle (yeni sekmede `/profile/:username`)
  - [x] Kullanıcıyı sil (onay dialog'u — `DELETE /api/admin/users/:id`)
- [x] Sayfalama (50 kayıt/sayfa)

### 3.3 İçerik Yönetimi — `/admin/posts`
- [x] Arama (başlık)
- [x] Kategori filtresi + içerik tipi filtresi
- [x] Tablo: Başlık · Yazar · Kategori · Tip · Tarih · Beğeni · Aksiyonlar
- [x] Satır aksiyonları:
  - [x] Postu görüntüle (`/post/:id` yeni sekme)
  - [x] Sil (onay dialog'u — `DELETE /api/admin/posts/:id`)
  - [x] Sabitle / Sabitlemeyi kaldır (`PUT /api/admin/posts/:id/pin`)
- [x] Sayfalama

### 3.4 Yorum Yönetimi — `/admin/comments`
- [x] Tablo: İçerik (kısaltılmış) · Kullanıcı · Post linki · Tarih · Aksiyonlar
- [x] Satır aksiyonları:
  - [x] Yorumu görüntüle (post detay sayfasına git)
  - [x] Sil (onay dialog'u — `DELETE /api/admin/comments/:id`)
- [x] Sayfalama

### 3.5 Kategori Yönetimi — `/admin/categories`
- [x] Mevcut kategorilerin sürükle-bırak sıralama listesi (`@dnd-kit/sortable`)
- [x] Her satır: İkon · Ad · Slug · Sıra · Aksiyonlar (Düzenle / Sil)
- [x] "Yeni Kategori" butonu → modal:
  - [x] Ad, Slug (otomatik türet), İkon (emoji), Açıklama, Sıra
  - [x] `POST /api/admin/categories`
- [x] Düzenle modal: mevcut alanları doldur, `PUT /api/admin/categories/:id`
- [x] Sil: içerik varsa uyarı, `DELETE /api/admin/categories/:id`

### 3.6 Radyo Yönetimi — `/admin/radio`
- [x] Şu an çalan parça kartı (cover + başlık + sanatçı + süre)
- [x] "Atla" butonu (`POST /api/admin/radio/skip`)
- [x] Kuyruk listesi (sürükle-bırak sıralama):
  - [x] Her satır: Cover · Başlık · Sanatçı · Süre · Sil butonu
- [x] "Parça Ekle" formu:
  - [x] Başlık, Sanatçı, Cover URL, Stream URL, Süre (saniye)
  - [x] `POST /api/admin/radio/tracks`

### 3.7 Davet Yönetimi — `/admin/invites`
- [x] Mevcut `InvitesView` bileşeni buraya taşındı (zaten var, sadece yeni layout'a entegre edilecek)

---

## 4. Frontend — Paylaşımlı Admin Bileşenleri

- [ ] `components/admin/ConfirmDialog.tsx` — "Emin misin?" onay modal'ı (sil işlemleri için)
- [ ] `components/admin/StatCard.tsx` — dashboard istatistik kartı (ikon + sayı + başlık + delta)
- [ ] `components/admin/DataTable.tsx` — genel amaçlı, `columns` + `data` prop'lu tablo (sıralama, sayfalama)
- [ ] `components/admin/RoleBadge.tsx` — admin / moderatör / user rozetleri
- [ ] `hooks/useAdminGuard.ts` — rol kontrolü hook'u; admin/mod değilse redirect

---

## 5. Geliştirme Öncelik Sırası

1. **Backend:** `GET /api/admin/stats` → Dashboard sayfasının bağımlılığı
2. **Frontend:** Admin layout + sidebar + route koruması (`AdminShell`, `middleware.ts`)
3. **Frontend:** Dashboard sayfası (stat kartları + son aktivite)
4. **Frontend:** Kullanıcı yönetimi sayfası (en çok ihtiyaç duyulan)
5. **Backend + Frontend:** Yorum silme endpoint'i + yorum yönetimi sayfası
6. **Frontend:** İçerik yönetimi sayfası
7. **Frontend:** Kategori yönetimi sayfası (sürükle-bırak dahil)
8. **Backend + Frontend:** Radyo yönetimi (track silme, skip)
9. **Frontend:** Davet sayfasını yeni admin layout'a taşı
10. **Backend (Opsiyonel):** Ban sistemi + duyuru modeli

---

## 6. Teknik Notlar

- Admin sayfaları `app/(admin)/` route grubu altında olmalı — `(main)` grubundaki AppShell (chat, oynatıcı, sidebarlar) **yüklenmemeli**
- Tüm admin API çağrıları mevcut `api` axios instance'ını kullanır (JWT otomatik eklenir)
- Moderatör rolü: Davet oluşturma, içerik silme, yorum silme yapabilir; kullanıcı silme ve rol değiştirme **yalnızca admin**
- Backend'deki `adminOnly` ve `adminOrMod` middleware'leri zaten doğru ayrılmış, frontend'de de aynı ayrımı yansıt
