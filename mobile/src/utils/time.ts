/**
 * Saniyeyi "m:ss" formatına çevirir. Örn: 185 → "3:05"
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * ISO tarih stringini "x dakika önce" / "dün" / "12 Mar" gibi gösterir.
 */
export function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'şimdi';
  if (diffMin < 60) return `${diffMin}dk`;
  if (diffHour < 24) return `${diffHour}sa`;
  if (diffDay === 1) return 'dün';
  if (diffDay < 7) return `${diffDay}g`;

  return date.toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'});
}

/**
 * Kayıt süresi sayacı için "00:00" formatı.
 */
export function formatRecordingTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
