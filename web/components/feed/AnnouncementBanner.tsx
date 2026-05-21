'use client'

import { useState } from 'react'
import { X, Radio } from 'lucide-react'

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  return (
    <div className="relative bg-[#2D2A5E] border-b border-[#3D3A7E] px-6 py-3 flex items-center gap-3">
      <Radio size={16} className="text-[#A09BE0] shrink-0 animate-pulse" />
      <p className="text-sm font-semibold text-[#E8E4FF] tracking-wide text-center flex-1">
        BU AKŞAM 22:30&apos;DA ZEKİ DEMİRKUBUZ SORULARINIZI YANITLIYOR.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="text-[#A09BE0] hover:text-white transition-colors shrink-0"
        aria-label="Kapat"
      >
        <X size={16} />
      </button>
    </div>
  )
}
