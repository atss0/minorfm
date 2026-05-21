export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}sn`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}dk`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}sa`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}g`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}ay`
  return `${Math.floor(mo / 12)}y`
}
