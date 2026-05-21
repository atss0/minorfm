import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: number
  delta?: number
  deltaLabel?: string
}

export default function StatCard({ icon: Icon, label, value, delta, deltaLabel }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={15} />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value.toLocaleString('tr-TR')}</p>
      {delta !== undefined && (
        <p className="text-xs text-muted">
          <span className="text-green-400 font-semibold">+{delta.toLocaleString('tr-TR')}</span>
          {' '}{deltaLabel ?? 'son dönemde'}
        </p>
      )}
    </div>
  )
}
