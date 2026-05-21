'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const TABS = [
  { id: 'new', label: 'yeniden eskiye' },
  { id: 'top', label: 'en süperler' },
  { id: 'curated', label: 'kürasyon' },
] as const

export default function FeedTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const active = searchParams.get('sort') ?? 'new'

  const setSort = (sort: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set('sort', sort)
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-1 border-b border-border px-4 shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setSort(tab.id)}
          className={`py-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.id
              ? 'border-primary text-white'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
