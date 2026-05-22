'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '@/lib/adminApi'
import { relativeTime } from '@/lib/time'

interface Announcement {
  id: string
  body: string
  url?: string
  active: boolean
  expires_at?: string
  created_at: string
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const { data: active } = useQuery<Announcement | null>({
    queryKey: ['admin-announcement-active'],
    queryFn: () => api.get('/api/announcements/active').then((r) => r.data ?? null),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: (payload: { body: string; url?: string }) =>
      api.post('/api/admin/announcements', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcement-active'] })
      queryClient.invalidateQueries({ queryKey: ['announcement-active'] })
      setBody('')
      setUrl('')
      setError('')
    },
    onError: () => setError('Oluşturma başarısız'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/api/admin/announcements/${id}`, { active }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcement-active'] })
      queryClient.invalidateQueries({ queryKey: ['announcement-active'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) { setError('Duyuru metni gereklidir'); return }
    createMutation.mutate({ body: body.trim(), url: url.trim() || undefined })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Duyurular</h1>
      </div>

      {/* Create form */}
      <section className="bg-surface border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-4">Yeni Duyuru</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Duyuru metni</label>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Duyuru içeriğini girin…"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Bağlantı (isteğe bağlı)</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            {createMutation.isPending ? 'Oluşturuluyor…' : 'Duyuru Oluştur'}
          </button>
        </form>
      </section>

      {/* Active announcement */}
      <section className="bg-surface border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-4">Aktif Duyuru</p>
        {!active ? (
          <p className="text-sm text-muted">Aktif duyuru yok.</p>
        ) : (
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-bg border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{active.body}</p>
              {active.url && (
                <a href={active.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block truncate">
                  {active.url}
                </a>
              )}
              <p className="text-xs text-muted mt-1">{relativeTime(active.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleMutation.mutate({ id: active.id, active: !active.active })}
                disabled={toggleMutation.isPending}
                className="p-1.5 text-muted hover:text-white transition-colors"
                aria-label={active.active ? 'Deaktif et' : 'Aktif et'}
              >
                {active.active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
