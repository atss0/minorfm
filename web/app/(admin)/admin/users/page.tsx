'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ExternalLink, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import api from '@/lib/adminApi'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import RoleBadge from '@/components/admin/RoleBadge'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { relativeTime } from '@/lib/time'
import type { User } from '@/types'

interface UsersResponse {
  data: User[]
  total: number
  page: number
  limit: number
}

const ROLE_FILTERS = [
  { value: '', label: 'Hepsi' },
  { value: 'user', label: 'Kullanıcı' },
  { value: 'moderator', label: 'Moderatör' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAdminAuthStore()
  const isAdmin = me?.role === 'admin'

  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users', q, role, page],
    queryFn: () =>
      api.get('/api/admin/users', { params: { q, role, page, limit: 50 } }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const roleMut = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: string }) =>
      api.put(`/api/admin/users/${id}/role`, { role: newRole }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/users/${id}`),
    onSuccess: (_, deletedId) => {
      setDeleteTarget(null)
      // Mevcut sayfanın cache'inden kaydı çıkar — invalidate yerine setQueryData
      // kullanılması sayfayı 1'e sıfırlamaz, kullanıcı bulunduğu sayfada kalır.
      qc.setQueryData<UsersResponse>(['admin-users', q, role, page], (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.filter((u) => u.id !== deletedId),
          total: old.total - 1,
        }
      })
    },
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  const handleSearch = useCallback((v: string) => {
    setQ(v)
    setPage(1)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Kullanıcılar</h1>
        {data && (
          <span className="text-sm text-muted">{data.total.toLocaleString('tr-TR')} kullanıcı</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Kullanıcı adı veya e-posta ara..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 shrink-0">
          {ROLE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setRole(f.value); setPage(1) }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                role === f.value ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 border-b border-border/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">
                    E-posta
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">
                    Kayıt
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data?.data.map(user => (
                  <tr key={user.id} className="hover:bg-border/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            width={28}
                            height={28}
                            className="rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {user.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">{user.email}</td>
                    <td className="px-4 py-3">
                      {isAdmin && user.id !== me?.id ? (
                        <select
                          value={user.role}
                          onChange={e => roleMut.mutate({ id: user.id, newRole: e.target.value })}
                          className="bg-bg border border-border rounded-md px-2 py-1 text-xs text-white outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="user">Kullanıcı</option>
                          <option value="moderator">Mod</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <RoleBadge role={user.role} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted hidden lg:table-cell">
                      {relativeTime(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/profile/${user.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted hover:text-white hover:bg-border transition-colors"
                          title="Profili görüntüle"
                        >
                          <ExternalLink size={14} />
                        </a>
                        {isAdmin && user.id !== me?.id && (
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Kullanıcıyı sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.data.length === 0 && (
              <p className="text-center text-sm text-muted py-10">Kullanıcı bulunamadı.</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-border text-muted hover:text-white hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-muted px-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-border text-muted hover:text-white hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Kullanıcıyı sil"
        description={`"${deleteTarget?.username}" kullanıcısı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
