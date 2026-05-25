export const MIN_AVATAR_SIZE = 40;
export const GAP = 8;
const PADDING = 16; // her iki yandan toplam yatay padding

/**
 * Dinleyici sayısına göre optimal sütun sayısını döner.
 */
export function optimalColumns(count: number): number {
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  if (count <= 6) return 3;
  if (count <= 9) return 3;
  if (count <= 12) return 4;
  if (count <= 16) return 4;
  if (count <= 20) return 5;
  if (count <= 25) return 5;
  if (count <= 36) return 6;
  return 6; // 37+ → 6 sütun sabit, scroll açık
}

/**
 * Ekran genişliği ve sütun sayısına göre avatar boyutunu hesaplar.
 * MIN_AVATAR_SIZE'dan küçük olamaz.
 */
export function calcAvatarSize(
  screenWidth: number,
  columns: number,
): number {
  const totalGap = GAP * (columns + 1);
  const available = screenWidth - PADDING - totalGap;
  const size = Math.floor(available / columns);
  return Math.max(size, MIN_AVATAR_SIZE);
}

/**
 * Tüm avatarlar mevcut yüksekliğe sığmıyorsa scroll gerekir.
 * Ayrıca avatarSize MIN'e takılmışsa (37+ kişi) scroll zorunludur.
 */
export function isScrollNeeded(
  count: number,
  avatarSize: number,
  columns: number,
  availableHeight: number,
): boolean {
  if (avatarSize <= MIN_AVATAR_SIZE && count > 36) return true;
  const rows = Math.ceil(count / columns);
  const totalHeight = rows * (avatarSize + GAP) + GAP;
  return totalHeight > availableHeight;
}

/**
 * Tek çağrıda tüm grid parametrelerini hesaplar.
 */
export function calcGridLayout(
  count: number,
  screenWidth: number,
  availableHeight: number,
): {
  columns: number;
  avatarSize: number;
  scrollEnabled: boolean;
} {
  if (count === 0) {
    return {columns: 1, avatarSize: 120, scrollEnabled: false};
  }
  const columns = optimalColumns(count);
  const avatarSize = calcAvatarSize(screenWidth, columns);
  const scrollEnabled = isScrollNeeded(count, avatarSize, columns, availableHeight);
  return {columns, avatarSize, scrollEnabled};
}
