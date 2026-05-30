-- R2 dev domainini (pub-*.r2.dev) custom domaine (cdn.minor.fm) taşır.
--
-- ÖNEMLİ: Bu scripti çalıştırmadan ÖNCE Cloudflare'de cdn.minor.fm custom
-- domaini bağlanmış ve "Active" durumda olmalı; aksi halde eski kayıtlar
-- çalışmayan bir URL'e işaret eder.
--
-- Sadece eski r2.dev domainini içeren satırlar güncellenir (LIKE filtresi).
-- Hedef domaini değiştirmek istersen 'cdn.minor.fm' yerlerini düzenle.

BEGIN;

UPDATE users
SET avatar_url = REPLACE(avatar_url, 'pub-095abdad53b3433a95bfc89aabcb0571.r2.dev', 'cdn.minor.fm')
WHERE avatar_url LIKE '%pub-095abdad53b3433a95bfc89aabcb0571.r2.dev%';

UPDATE recordings
SET audio_url = REPLACE(audio_url, 'pub-095abdad53b3433a95bfc89aabcb0571.r2.dev', 'cdn.minor.fm')
WHERE audio_url LIKE '%pub-095abdad53b3433a95bfc89aabcb0571.r2.dev%';

UPDATE tracks
SET cover_url = REPLACE(cover_url, 'pub-095abdad53b3433a95bfc89aabcb0571.r2.dev', 'cdn.minor.fm')
WHERE cover_url LIKE '%pub-095abdad53b3433a95bfc89aabcb0571.r2.dev%';

UPDATE tracks
SET stream_url = REPLACE(stream_url, 'pub-095abdad53b3433a95bfc89aabcb0571.r2.dev', 'cdn.minor.fm')
WHERE stream_url LIKE '%pub-095abdad53b3433a95bfc89aabcb0571.r2.dev%';

UPDATE announcements
SET url = REPLACE(url, 'pub-095abdad53b3433a95bfc89aabcb0571.r2.dev', 'cdn.minor.fm')
WHERE url LIKE '%pub-095abdad53b3433a95bfc89aabcb0571.r2.dev%';

COMMIT;

-- Doğrulama: aşağıdaki sorgular 0 satır dönmeli (eski domain kalmadı)
-- SELECT count(*) FROM users       WHERE avatar_url LIKE '%r2.dev%';
-- SELECT count(*) FROM recordings  WHERE audio_url  LIKE '%r2.dev%';
