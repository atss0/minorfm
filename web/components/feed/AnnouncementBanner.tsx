'use client'

import { useState } from 'react'
import { X, Radio } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface Announcement {
  id: string
  body: string
  url?: string
  active: boolean
}

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false)

  const { data: ann } = useQuery<Announcement | null>({
    queryKey: ['announcement-active'],
    queryFn: () => api.get('/api/announcements/active').then((r) => r.data ?? null),
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (!ann || dismissed) return null

  return (
    <div className="relative bg-[#2D2A5E] border-b border-[#3D3A7E] px-6 py-3 flex items-center gap-3">
      <Radio size={16} className="text-[#A09BE0] shrink-0 animate-pulse" />
      {ann.url ? (
        <a
          href={ann.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#E8E4FF] tracking-wide text-center flex-1 hover:underline"
        >
          {ann.body}
        </a>
      ) : (
        <p className="text-sm font-semibold text-[#E8E4FF] tracking-wide text-center flex-1">
          {ann.body}
        </p>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="text-[#A09BE0] hover:text-white transition-colors shrink-0"
        aria-label="Kapat"
      >
        <X size={16} />
      </button>
    </div>
  )
}
