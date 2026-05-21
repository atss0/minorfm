'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Trash2, Plus, Check, Shield } from 'lucide-react'
import api from '@/lib/adminApi'
import { relativeTime } from '@/lib/time'

interface Invite {
  id: string
  code: string
  created_at: string
  expires_at: string | null
  used_at: string | null
  used_by_user: { username: string } | null
  creator: { username: string }
}

function InviteRow({ invite, onRevoke }: { invite: Invite; onRevoke: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const isUsed = !!invite.used_by_user
  const isExpired = invite.expires_at ? new Date(invite.expires_at) < new Date() : false
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3000'
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : apiUrl}/register?invite=${invite.code}`

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isUsed || isExpired ? 'border-border/50 opacity-60' : 'border-border'} bg-surface`}>
      <span className="font-mono text-sm font-semibold text-white tracking-widest w-24 shrink-0">
        {invite.code}
      </span>

      <div className="flex-1 min-w-0 text-xs text-muted space-y-0.5">
        <p>
          {isUsed ? (
            <span className="text-green-400">Kullanıldı — <span className="text-white">{invite.used_by_user?.username}</span></span>
          ) : isExpired ? (
            <span className="text-primary">Süresi doldu</span>
          ) : (
            <span className="text-green-400/80">Aktif</span>
          )}
        </p>
        <p>
          {relativeTime(invite.created_at)} oluşturuldu
          {invite.expires_at ? ` · ${relativeTime(invite.expires_at)} bitiş` : ''}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isUsed && !isExpired && (
          <>
            <button
              onClick={copy}
              title="Linki kopyala"
              className="p-1.5 rounded-md text-muted hover:text-white hover:bg-border transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => onRevoke(invite.id)}
              title="İptal et"
              className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function InvitesView() {
  const qc = useQueryClient()
  const [expiresInDays, setExpiresInDays] = useState(0)

  const { data: invites = [], isLoading } = useQuery<Invite[]>({
    queryKey: ['admin-invites'],
    queryFn: async () => (await api.get('/api/admin/invites')).data,
  })

  const createMut = useMutation({
    mutationFn: () =>
      api.post('/api/admin/invites', expiresInDays > 0 ? { expires_in_days: expiresInDays } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-invites'] }),
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-invites'] }),
  })

  const active = invites.filter((i) => !i.used_by_user && !(i.expires_at && new Date(i.expires_at) < new Date()))
  const past = invites.filter((i) => i.used_by_user || (i.expires_at && new Date(i.expires_at) < new Date()))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={18} className="text-primary" />
        <h1 className="text-lg font-bold text-white">Davet Yönetimi</h1>
      </div>

      {/* Generate */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Yeni Davet Oluştur</p>
        <div className="flex items-center gap-3">
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
          >
            <option value={0}>Süresiz</option>
            <option value={1}>1 gün</option>
            <option value={7}>7 gün</option>
            <option value={30}>30 gün</option>
          </select>
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} />
            {createMut.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </div>
        <p className="text-xs text-muted">
          Oluşturulan link: <code className="text-primary">/register?invite=XXXXXXXX</code>
        </p>
      </div>

      {/* Active invites */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Aktif ({active.length})</p>
              {active.map((inv) => (
                <InviteRow key={inv.id} invite={inv} onRevoke={(id) => revokeMut.mutate(id)} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Geçmiş ({past.length})</p>
              {past.map((inv) => (
                <InviteRow key={inv.id} invite={inv} onRevoke={(id) => revokeMut.mutate(id)} />
              ))}
            </div>
          )}

          {invites.length === 0 && (
            <p className="text-center text-sm text-muted py-8">Henüz davet oluşturulmamış.</p>
          )}
        </>
      )}
    </div>
  )
}
