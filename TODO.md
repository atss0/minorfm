# MINOR.fm — Kapsamlı Yapılacaklar Listesi

> Stack: **Backend** Go + Fiber + GORM + PostgreSQL + Redis | **Web** Next.js + Zustand | **Mobil** React Native CLI + Zustand

---

## 📦 BACKEND (Go + Fiber + GORM + PostgreSQL + Redis)

### 1. Proje Kurulumu & Altyapı
- [x] Go modülü başlat (`go mod init`)
- [x] Dizin yapısını oluştur: `cmd/`, `internal/`, `pkg/`, `config/`, `migrations/`
- [x] Fiber framework ekle, temel `main.go` yaz
- [x] `.env` tabanlı config sistemi kur (`godotenv`)
- [x] PostgreSQL bağlantısı kur (GORM + `pgx` driver)
- [x] Redis bağlantısı kur (`go-redis`)
- [x] GORM auto-migrate pipeline hazırla
- [x] Structured logging ekle (Fiber built-in logger middleware)
- [x] Graceful shutdown mekanizması yaz
- [x] Docker + `docker-compose.yml` hazırla (postgres, redis, app servisleri)
- [x] Makefile veya `air` ile hot-reload geliştirme ortamı kur

### 2. Veritabanı Modelleri (GORM)
- [x] `User` — id, username, email, password_hash, avatar_url, bio, role (admin/moderator/user), created_at
- [x] `Category` — id, name, slug, icon, description, order
- [x] `Post` — id, user_id, category_id, title, body, post_type (article/poll/video/embed), metadata (JSONB), created_at, updated_at
- [x] `Comment` — id, post_id, user_id, parent_id (nested), body, created_at
- [x] `Like` — id, user_id, likeable_id, likeable_type (polymorphic: post/comment)
- [x] `Bookmark` — id, user_id, post_id, collection_name, created_at
- [x] `Follow` — id, follower_id, following_id (kullanıcı takip)
- [x] `ChatMessage` — id, room_id, user_id, body, created_at
- [x] `ChatRoom` — id, name, slug, type (global/category/dm), category_id nullable
- [x] `Notification` — id, user_id, type, payload (JSONB), read, created_at
- [x] `Track` — id, title, artist, cover_url, stream_url, duration (global radyo için)
- [x] `Poll` — id, post_id; `PollOption` — id, poll_id, text, vote_count
- [x] `PollVote` — id, poll_id, option_id, user_id

### 3. Kimlik Doğrulama (Auth)
- [x] Kayıt endpoint'i — şifre bcrypt hash, validation
- [x] Giriş endpoint'i — JWT access token + refresh token üret
- [x] Refresh token endpoint'i
- [x] Logout (Redis'te token blacklist)
- [x] JWT middleware (Fiber)
- [x] Rol tabanlı yetkilendirme middleware (admin / moderator / user)
- [x] Şifre sıfırlama akışı (email token)

### 4. API Endpoint'leri

#### Kullanıcı
- [x] `GET /api/users/:username` — profil getir
- [x] `PUT /api/users/me` — profil güncelle (bio, avatar)
- [x] `PUT /api/users/me/password` — şifre güncelle
- [x] `POST /api/users/:id/follow` — takip et/bırak
- [x] `GET /api/users/:id/followers` — takipçiler
- [x] `GET /api/users/:id/following` — takip edilenler

#### Kategori
- [x] `GET /api/categories` — tüm kategorileri listele
- [x] `GET /api/categories/:slug` — kategori detayı

#### Post / İçerik
- [x] `GET /api/posts` — ana akış (filtre: new/top/curated, sayfalama)
- [x] `GET /api/posts?category=:slug` — kategoriye göre akış
- [x] `GET /api/posts/:id` — post detayı
- [x] `POST /api/posts` — yeni post oluştur (auth gerekli)
- [x] `PUT /api/posts/:id` — post düzenle (yazar veya mod)
- [x] `DELETE /api/posts/:id` — post sil
- [x] `POST /api/posts/:id/like` — beğen/beğenme al
- [x] `POST /api/posts/:id/bookmark` — kaydet/kaldır

#### Yorum
- [x] `GET /api/posts/:id/comments` — nested yorumlar
- [x] `POST /api/posts/:id/comments` — yorum ekle
- [x] `DELETE /api/comments/:id` — yorum sil
- [x] `POST /api/comments/:id/like` — yorum beğeni

#### Anket
- [x] `POST /api/polls/:id/vote` — oy ver
- [x] `GET /api/polls/:id/results` — sonuçları getir

#### Koleksiyon / Bookmark
- [x] `GET /api/bookmarks` — kullanıcı bookmarkları
- [x] `GET /api/collections/:name` — koleksiyon içeriği

#### Bildirim
- [x] `GET /api/notifications` — bildirim listesi
- [x] `PUT /api/notifications/read-all` — tümünü okundu işaretle

#### Radyo / Medya
- [x] `GET /api/radio/current` — şu an çalan parça
- [x] `GET /api/radio/queue` — sıradaki parçalar
- [x] `POST /api/radio/tracks` — parça ekle (admin)

### 5. WebSocket (Fiber + Gorilla/nhooyr)
- [x] WebSocket hub mimarisi kur (room bazlı)
- [x] `/ws/chat/:room_id` — sohbet odası WebSocket
- [x] `/ws/radio` — global radyo durum yayını (şu an çalan, sıra)
- [x] `/ws/notifications` — gerçek zamanlı bildirimler
- [x] Chat mesajlarını Redis Pub/Sub üzerinden dağıt (çok instance için)
- [x] Bağlantı kimlik doğrulaması (JWT query param veya cookie)
- [x] Rate limiting: chat mesajı gönderme hızı

### 6. Redis Kullanımları
- [x] JWT refresh token store + blacklist
- [x] Chat mesajları için Redis Pub/Sub
- [x] Hot post feed cache (sorted set, TTL 5 dk)
- [x] Online kullanıcı listesi (sorted set, score = last_seen)
- [x] Radyo durumu cache (current track, queue)
- [x] Rate limiting (sliding window counter)
- [x] Session store — Redis-backed `/api/me` endpoint with 15-min TTL cache

### 7. Medya & Dosya Yükleme
- [x] Avatar yükleme endpoint'i (multipart)
- [x] Cloudflare R2 entegrasyonu (S3-compatible)
- [x] Dosya boyutu ve tip validasyonu
- [x] Resim boyutlandırma (thumbnail üretimi — disintegration/imaging ile server-side resize)

### 8. Arama
- [x] `GET /api/search?q=` — post ve kullanıcı full-text arama (PostgreSQL ILIKE)

### 9. Yönetim (Admin)
- [x] `GET /api/admin/users` — kullanıcı listesi
- [x] `PUT /api/admin/users/:id/role` — rol değiştir
- [x] `DELETE /api/admin/posts/:id` — içerik kaldır
- [x] `POST /api/admin/categories` — kategori ekle/düzenle

### 10. Test & Kalite
- [x] Unit test: auth, post servisleri (handlers_test, in-memory SQLite)
- [x] Integration test: gerçek Postgres + Redis ile (`-tags=integration`, internal/integration/)
- [x] API endpoint testleri (httptest)
- [x] CI pipeline (GitHub Actions — .github/workflows/ci.yml)
- [x] Swagger / OpenAPI dokümantasyonu (`swaggo` — /swagger/* endpoint, docs/ klasörü)
- [x] `.golangci.yml` linter konfigürasyonu

---

## 🌐 WEB FRONTEND (Next.js + Zustand)

### 1. Proje Kurulumu
- [x] `create-next-app` ile proje başlat (App Router, TypeScript)
- [x] Tailwind CSS kur ve tema renkleri ayarla (`#BC022D`, `#0B1114` + surface/border/muted)
- [x] Zustand kur, store dosyalarını ayır: `authStore`, `playerStore`, `chatStore`, `uiStore`
- [x] Axios HTTP istemcisi, interceptor ile JWT yönetimi + refresh token
- [x] `tanstack/react-query` — sunucu state yönetimi (cache, refetch)
- [x] `lucide-react` ikon kütüphanesi
- [x] ESLint (Next.js built-in)
- [x] Path alias (`@/`) kur

### 2. Global Layout & Bileşenler

#### Header (Üst Bar)
- [x] MINOR.fm logosu ve marka bağlantısı
- [x] Global radyo oynatıcı bileşeni
  - [x] Önceki / Oynat-Duraklat / Sonraki düğmeleri
  - [x] Zaman çubuğu (seek bar) — kırmızı dolgu, overlay input
  - [x] Süre gösterimi (0:19 / 2:49)
  - [x] Karıştır ve tekrar düğmeleri
  - [x] Ses seviyesi kontrolü
  - [x] Şu an çalan parça adı ve sanatçı
- [x] Profil avatarı + kullanıcı adı (Zustand `authStore`'dan)
- [x] Bildirim ikonu (okunmamış sayacı)
- [x] Hamburger menü (sidebar toggle)
- [x] Oynatıcı state'ini `playerStore`'a bağla (isPlaying, currentTrack, volume, progress)

#### Sol Sidebar (Kategori & Kişiler)
- [x] "Akış" navigasyon bağlantısı
- [x] Dinamik kategori listesi (React Query ile API'den, placeholder fallback)
- [x] Aktif kategori highlight (pathname bazlı)
- [x] Takip edilen kullanıcı listesi (avatar + isim)
- [x] Online göstergesi (yeşil nokta)
- [x] Sidebar collapse/expand (`uiStore.toggleSidebar`)
- [x] "Koleksiyon" özel bağlantısı (kategori listesinde)

#### Sağ Sidebar (Canlı Sohbet)
- [x] Sohbet odası başlığı + oda seçici dropdown (placeholder)
- [x] Mesaj listesi (mock mesajlarla iskelet)
- [x] Her mesaj: avatar, @kullanıcı adı, rozet (👑 #1, #2), mesaj metni
- [x] WebSocket bağlantısı (`useEffect`, `chatStore`) — `useChat` hook, AppShell'den kalıcı bağlantı
- [x] Mesaj giriş alanı + emoji seçici + gönder
- [x] Chat kapatma (X) düğmesi
- [x] "En Etkin Takipçiler" sekmesi

### 3. Sayfalar

#### Ana Akış — `/`
- [x] Üst duyuru/banner bileşeni (canlı etkinlik bildirimi)
- [x] Tab bar: "yeniden eskiye" / "en süperler" / "kürasyon"
- [x] Sonsuz scroll veya "Daha fazla" yükle
- [x] Post kartı bileşeni (tip'e göre dinamik render):
  - `article` — başlık + metin önizleme
  - `video/embed` — YouTube/Vimeo embed
  - `poll` — anket bileşeni (seçenekler, oy bar)
  - `link` — link önizleme kartı
- [x] Post kartı: beğeni, yorum sayısı, paylaş, bookmark ikonları
- [x] İskelet (skeleton) yükleme durumu

#### Kategori Sayfası — `/category/[slug]`
- [x] Kategori sayfası oluşturuldu (`/category/[slug]`)
- [x] FeedView kategoriye özel filtre ile entegre edildi
- [x] Aynı filtreleme tab'ları
- [x] Kategori başlığı ve açıklaması (kategori detay API entegrasyonuyla birlikte)
- [x] Kategoriye abone ol butonu

#### İçerik Detay — `/post/[id]`
- [x] Tam post içeriği (markdown render)
- [x] Yazar bilgisi, tarih, kategori etiketi
- [x] Beğeni ve bookmark aksiyonları
- [x] Yorum bölümü:
  - [x] Nested yorum ağacı
  - [x] Yorum yazma formu (auth gerekli)
  - [x] Yorum beğenisi
  - [x] "Yanıtla" thread'i
- [x] Paylaş butonu (link kopyala)

#### Koleksiyon — `/collection`
- [x] Moderatör seçkisi / kullanıcının kayıtları
- [x] Post kart grid görünümü

#### Kullanıcı Profili — `/profile/[username]`
- [x] Avatar
- [x] Kullanıcı adı, biyografi
- [x] Takip et / Takipten çık butonu
- [x] İstatistikler: post sayısı, takipçi, takip
- [x] Post listesi (aynı kart bileşeni)

#### Giriş / Kayıt — `/login`, `/register`
- [x] Ekranın ortasında dark temalı tam sayfa (`(auth)` route grubu, AppShell yok)
- [x] Form validasyonu (`react-hook-form` + `zod`)
- [x] Hata mesajları (API hatası + field hataları)
- [x] Şifremi unuttum akışı (`/forgot-password`, `/reset-password`)
- [x] Başarılı giriş → yönlendirme + `authStore` güncelleme (persist ile)

#### Ayarlar — `/settings`
- [x] Profil fotoğrafı yükleme (önizleme + crop)
- [x] Kullanıcı adı ve biyografi düzenleme
- [x] E-posta ve şifre güncelleme
- [x] Bildirim tercihleri (chat sesi, email bildirimleri)
- [x] Hesabı sil (tehlike bölgesi)

### 4. Zustand Store'ları
- [x] `authStore` — user, accessToken, refreshToken, setAuth(), logout() (persist ile)
- [x] `playerStore` — isPlaying, currentTrack, queue, volume, progress, play/pause/next/prev/shuffle/repeat
- [x] `chatStore` — messages, activeRoom, socket, isConnected, addMessage(), setRoom()
- [x] `uiStore` — sidebarOpen, chatOpen, notificationCount, toggle aksiyonları

### 5. WebSocket İstemcisi
- [x] WebSocket hook (`useChat`) — bağlan, yeniden bağlan (exponential backoff), mesaj dinle, geçmiş yükle
- [x] Radyo WebSocket (`useRadio`) — currentTrack, isPlaying senkronize et
- [x] Bildirim WebSocket (`useNotifications`)

### 6. Performans & SEO
- [x] Next.js App Router Server Components kullan (feed, kategori, profil)
- [x] `generateMetadata` ile dinamik SEO meta tag'leri (post, profil, kategori)
- [x] `next/image` ile optimize görsel
- [x] `next/font` ile font optimizasyonu (`display: 'swap'`, CSS variable)
- [x] React Query prefetch + hydration (SSR — `HydrationBoundary`)
- [ ] Lighthouse skoru hedefi: 90+

### 7. Test
- [x] Vitest + React Testing Library kurulumu (`vitest.config.ts`, `vitest.setup.ts`)
- [x] Kritik bileşen testleri (PostCard — `__tests__/PostCard.test.tsx`)
- [x] Zustand store unit testleri (`authStore`, `uiStore`)
- [x] Playwright ile E2E: login akışı, feed (`e2e/auth.spec.ts`, `e2e/feed.spec.ts`)

---

## 📱 MOBİL (React Native CLI + Zustand)

### 1. Proje Kurulumu
- [ ] `react-native init MinorFM --template react-native-template-typescript`
- [ ] Gerekli native bağımlılıkları kur ve link et
- [ ] Zustand kur, web ile aynı store yapısını paylaş (monorepo veya kopyala)
- [ ] `@react-navigation/native` + `Stack` + `BottomTab` navigatör kur
- [ ] Axios + JWT interceptor
- [ ] React Query kur
- [ ] `react-native-track-player` — arka plan ses oynatma
- [ ] `react-native-vector-icons` veya `react-native-svg` ikon seti
- [ ] `react-native-async-storage` — token kalıcılığı
- [ ] `react-native-flash-message` veya toast bildirimleri
- [ ] ESLint + Prettier

### 2. Navigasyon Yapısı
- [ ] `AuthStack` — Login, Register, ForgotPassword ekranları
- [ ] `AppStack` — kimlik doğrulandıktan sonra
  - [ ] `BottomTabNavigator`:
    - [ ] Tab: Ana Akış (Home)
    - [ ] Tab: Kategoriler
    - [ ] Tab: Koleksiyon
    - [ ] Tab: Profil
  - [ ] `Modal`: PostDetail, Chat, Settings
- [ ] Deep link yapılandırması (`minorfm://post/:id`, `minorfm://profile/:username`)

### 3. Global Bileşenler

#### Mini Oynatıcı (Persistent Player Bar)
- [ ] Ekranın altında sabit, BottomTab'ın üzerinde
- [ ] Şu an çalan parça adı + sanatçı + kapak küçük resim
- [ ] Oynat/Duraklat butonu
- [ ] Tam ekran oynatıcıya geçiş (swipe up veya tap)
- [ ] `react-native-track-player` ile bağlantı
- [ ] `playerStore` ile senkronize

#### Tam Ekran Oynatıcı (Modal)
- [ ] Büyük kapak resmi
- [ ] Şarkı adı ve sanatçı
- [ ] Seek bar (slider)
- [ ] Önceki / Oynat / Sonraki / Karıştır
- [ ] Ses seviyesi kontrolü
- [ ] Sıradaki parçalar listesi

### 4. Ekranlar

#### Ana Akış — `HomeScreen`
- [ ] Üst duyuru banner'ı
- [ ] Horizontal scroll tab bar: yeniden eskiye / en süperler / kürasyon
- [ ] `FlatList` sonsuz scroll ile post kartları
- [ ] Tip bazlı render: makale, video, anket, bağlantı
- [ ] Pull-to-refresh
- [ ] İskelet yükleme

#### Kategori Listesi — `CategoriesScreen`
- [ ] Izgara veya liste görünümü, ikon + isim
- [ ] Kategoriye dokunulduğunda `CategoryFeedScreen`'e git

#### Kategori Akışı — `CategoryFeedScreen`
- [ ] Başlık ve açıklama
- [ ] Kategoriye özel post listesi
- [ ] Kategoriye abone ol düğmesi

#### Post Detay — `PostDetailScreen`
- [ ] Tam içerik
- [ ] Nested yorum listesi (`SectionList` veya ağaç)
- [ ] Yorum giriş kutusu (klavye farkındalığı: `KeyboardAvoidingView`)
- [ ] Beğeni ve bookmark aksiyonları

#### Kullanıcı Profili — `ProfileScreen`
- [ ] Avatar, kullanıcı adı, biyografi
- [ ] Takip butonu
- [ ] İstatistikler
- [ ] Post/Beğeni/Kaydedilen sekmeleri (`MaterialTopTabNavigator`)

#### Koleksiyon — `CollectionScreen`
- [ ] Kaydedilen içerikler
- [ ] Koleksiyon adına göre grupla

#### Canlı Sohbet — `ChatScreen` (Modal)
- [ ] WebSocket bağlantısı
- [ ] Mesaj listesi (`InvertedFlatList`)
- [ ] Mesaj giriş alanı + emoji + gönder
- [ ] Oda seçici

#### Giriş / Kayıt — `LoginScreen`, `RegisterScreen`
- [ ] Dark temalı, siyah arka plan
- [ ] Form validasyonu (`react-hook-form` + `zod`)
- [ ] Biometrik giriş (Face ID / Fingerprint) — opsiyonel

#### Ayarlar — `SettingsScreen`
- [ ] Avatar güncelle (kameradan veya galeriden)
- [ ] Profil düzenleme
- [ ] Bildirim tercihleri
- [ ] Çıkış yap

### 5. Zustand Store'ları (Web ile paylaşımlı yapı)
- [ ] `authStore` — AsyncStorage ile kalıcı token
- [ ] `playerStore` — `react-native-track-player` olaylarına bağlı
- [ ] `chatStore` — WebSocket yönetimi
- [ ] `uiStore` — modal durumları, tab durumu

### 6. Push Bildirimleri
- [ ] Firebase Cloud Messaging (FCM) entegrasyonu
- [ ] `@react-native-firebase/messaging` kur
- [ ] Arka plan ve ön plan bildirim yönetimi
- [ ] Backend'e device token kaydet
- [ ] Bildirime dokunulduğunda ilgili ekrana yönlendir

### 7. Native Özellikler
- [ ] Arka plan ses oynatma (lock screen kontrolleri dahil)
- [ ] Kamera / galeri erişimi (avatar)
- [ ] Biometrik kimlik doğrulama
- [ ] Haptic feedback (beğeni, gönder)
- [ ] Network bağlantı durumu (`@react-native-community/netinfo`)
- [ ] Uygulama arka plana gittiğinde WebSocket yeniden bağlantı yönetimi

### 8. Test & Yayın
- [ ] Jest + React Native Testing Library kurulumu
- [ ] Kritik bileşen testleri
- [ ] Detox ile E2E (login, post akışı)
- [ ] iOS: Xcode ayarları, sertifikalar, App Store Connect
- [ ] Android: keystore, `build.gradle`, Play Console
- [ ] Fastlane ile CI/CD dağıtım otomasyonu

---

## 🔗 Ortak / DevOps Görevler

- [ ] Monorepo yapısını değerlendir (Turborepo): `apps/web`, `apps/mobile`, `apps/backend`, `packages/shared-types`
- [ ] Paylaşılan TypeScript tipleri paketi (`@minorfm/types`): Post, User, Category, ChatMessage arayüzleri
- [ ] API base URL ortam değişkenleri (dev / staging / prod)
- [ ] Backend için GitHub Actions CI: test + lint + build
- [ ] Web için GitHub Actions CI: test + lint + `next build`
- [ ] Nginx reverse proxy konfigürasyonu (API + web aynı domain)
- [ ] SSL sertifikası (Let's Encrypt / Certbot)
- [ ] Veritabanı yedekleme otomasyonu (pg_dump cronjob)
- [ ] Hata izleme: Sentry (backend + web + mobil)
- [ ] Analitik: Posthog veya Plausible
- [ ] Rate limiting stratejisi (global + endpoint bazlı)
- [ ] CORS politikası (production domain kısıtlaması)
- [ ] Content Security Policy (CSP) başlıkları

---

## 🎨 Tasarım Referansları (Ekran Görüntüsünden)

### Temel Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| `color-primary` | `#BC022D` | CTA butonlar, progress bar, aktif state, vurgu |
| `color-background` | `#0B1114` | Sayfa arka planı, sidebar arka planı |
| `color-surface` | `#131C21` | Kart, modal, input arka planı (background üzerine hafif katman) |
| `color-border` | `#1E2C33` | Ayraçlar, input kenarlıkları |
| `color-text-primary` | `#FFFFFF` | Ana başlıklar, menü isimleri |
| `color-text-secondary` | `#8A9BA8` | Yardımcı metin, meta bilgi, tarih |
| `color-accent-chat` | mor/lacivert tonları | Sohbet rozetleri ve post kart arka planları |

> **Tailwind kullanımı (web):** `tailwind.config.ts` içinde `colors.primary`, `colors.bg`, `colors.surface` olarak tanımla.
> **React Native kullanımı (mobil):** `theme/colors.ts` dosyasında sabit olarak export et, `StyleSheet` içinde referans ver.

### Diğer Tasarım Notları

| Eleman | Detay |
|---|---|
| Font | Sans-serif, beyaz metin |
| Sol sidebar | Kategori ikonları + emoji, kullanıcı avatarları |
| Sağ sidebar | Canlı sohbet, beyaz arka plan, renkli rozetler |
| Oynatıcı | Header'a entegre, `#BC022D` progress bar, tam genişlik |
| Post kartı | Geniş, lacivert/mor arka planlı bloklar, duyuru banner'ı |

---

## 🚀 Geliştirme Öncelik Sırası (Önerilen)

1. ~~**Backend:** Auth + User + Category + Post CRUD API~~ ✅ **TAMAMLANDI**
2. ~~**Web:** Layout iskeleti (Header, Sol Sidebar, Sağ Sidebar placeholder) + Login/Register~~ ✅ **TAMAMLANDI**
3. ~~**Web:** Ana Akış sayfası ve Post Kartı bileşenleri~~ ✅ **TAMAMLANDI**
4. ~~**Backend:** WebSocket chat + Redis Pub/Sub~~ ✅ **TAMAMLANDI**
5. ~~**Web:** Canlı Sohbet sağ sidebar entegrasyonu~~ ✅ **TAMAMLANDI**
6. ~~**Backend + Web:** Radyo oynatıcı (playerStore + WebSocket)~~ ✅ **TAMAMLANDI**
7. ~~**Web:** Post Detay, Profil, Koleksiyon sayfaları~~ ✅ **TAMAMLANDI**
8. **Mobil:** Navigasyon iskeleti + Auth ekranları
9. **Mobil:** Ana Akış, Kategori, Post Detay ekranları
10. **Mobil:** react-native-track-player entegrasyonu
11. **Mobil:** WebSocket chat + push bildirimleri
12. **Tüm:** Test, CI/CD, production deploy
