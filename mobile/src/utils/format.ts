/**
 * Büyük sayıları kısaltır. Örn: 1200 → "1.2K", 1500000 → "1.5M"
 */
export function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Kullanıcı adının baş harflerini avatar fallback için döner.
 * Örn: "ozgurles" → "O", "ahmet yilmaz" → "AY"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}
