'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Post } from '@/types'

interface PollOption {
  id: string
  text: string
  vote_count: number
}

interface PollData {
  id: string
  post_id: string
  options: PollOption[]
}

// Polls are low-churn data; 1-minute freshness is acceptable.
const POLL_STALE_MS = 60_000

export default function PostCardPoll({ post }: { post: Post }) {
  const { user } = useAuthStore()
  const [votedId, setVotedId] = useState<string | null>(null)
  const [optimisticOpts, setOptimisticOpts] = useState<PollOption[] | null>(null)

  const { data: poll, isLoading } = useQuery<PollData | null>({
    queryKey: ['poll', post.id],
    queryFn: () =>
      api
        .get(`/api/posts/${post.id}/poll`, { validateStatus: (s) => s < 500 })
        .then((r) => (r.status === 404 ? null : (r.data as PollData))),
    staleTime: POLL_STALE_MS,
    retry: false,
  })

  const options = optimisticOpts ?? poll?.options ?? []
  const total = options.reduce((s, o) => s + (o.vote_count ?? 0), 0)
  const pct = (votes: number) => (total > 0 ? Math.round((votes / total) * 100) : 0)

  const vote = async (optId: string) => {
    if (!user || votedId || !poll) return
    setVotedId(optId)
    setOptimisticOpts(
      options.map((o) => (o.id === optId ? { ...o, vote_count: (o.vote_count ?? 0) + 1 } : o))
    )
    try {
      // poll.id is the Poll table UUID — the vote endpoint expects this, not post.id
      await api.post(`/api/polls/${poll.id}/vote`, { option_id: optId })
    } catch {
      setVotedId(null)
      setOptimisticOpts(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Link href={`/post/${post.id}`} className="group">
          <h2 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-snug">
            {post.title}
          </h2>
        </Link>
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-9 bg-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Link href={`/post/${post.id}`} className="group">
        <h2 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h2>
      </Link>

      <div className="space-y-2">
        {options.map((opt) => {
          const p = pct(opt.vote_count ?? 0)
          const isVoted = votedId === opt.id
          const showBar = !!votedId

          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={!!votedId || !user}
              className={`relative w-full text-left rounded-lg overflow-hidden border transition-colors ${
                isVoted ? 'border-primary' : 'border-border hover:border-muted/50'
              } ${!votedId && user ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {showBar && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isVoted ? 'bg-primary/20' : 'bg-border/40'
                  }`}
                  style={{ width: `${p}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={`text-sm ${isVoted ? 'text-primary font-semibold' : 'text-white'}`}>
                  {opt.text}
                </span>
                {showBar && (
                  <span className="text-xs text-muted font-medium tabular-nums">{p}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted">
        {total.toLocaleString('tr-TR')} oy
        {!user && (
          <span className="ml-1">
            —{' '}
            <Link href="/login" className="text-primary hover:underline">
              oy vermek için giriş yap
            </Link>
          </span>
        )}
      </p>
    </div>
  )
}
