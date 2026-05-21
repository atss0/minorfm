'use client'

import { useState } from 'react'
import { Bell, BellOff, PenLine } from 'lucide-react'
import CreatePostModal from '@/components/post/CreatePostModal'
import { useAuthStore } from '@/store/authStore'
import type { Category } from '@/types'

const CREATE_CATEGORIES = new Set([
  'hiperfokus', 'dipses', 'sinemaskop', 'okuryazar', 'sualite', 'hemfikir', 'sinedump',
])

interface Props {
  category: Category | null
  slug: string
}

export default function CategoryHeader({ category, slug }: Props) {
  const { user } = useAuthStore()
  const [subscribed, setSubscribed] = useState(false)
  const [creating, setCreating] = useState(false)

  const name = category?.name ?? slug
  const icon = category?.icon ?? ''
  const description = category?.description ?? ''

  const canCreate = user && category && CREATE_CATEGORIES.has(slug)

  return (
    <>
      <div className="border-b border-border px-6 py-5 bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="text-3xl leading-none shrink-0">{icon}</span>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight">{name}</h1>
              {description && (
                <p className="text-sm text-muted mt-0.5 line-clamp-2">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canCreate && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
              >
                <PenLine size={14} />
                Paylaş
              </button>
            )}

            <button
              onClick={() => setSubscribed((v) => !v)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                subscribed
                  ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20'
                  : 'bg-surface border-border text-muted hover:text-white hover:border-muted'
              }`}
            >
              {subscribed ? <BellOff size={14} /> : <Bell size={14} />}
              {subscribed ? 'Takipten çık' : 'Takip et'}
            </button>
          </div>
        </div>
      </div>

      {creating && category && (
        <CreatePostModal category={category} onClose={() => setCreating(false)} />
      )}
    </>
  )
}
