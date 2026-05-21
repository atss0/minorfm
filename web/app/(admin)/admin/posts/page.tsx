'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ExternalLink, Trash2, Pin, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { relativeTime } from '@/lib/time'
import type { Post, Category } from '@/types'

interface PostsResponse {
  data: Post[]
  total: number
  page: number
  limit: number
}

const POST_TYPES = [
  { value: '', label: 'Tüm Tipler' },
  { value: 'article', label: 'Makale' },
  { value: 'poll', label: 'Anket' },
  { value: 'video', label: 'Video' },
  { value: 'embed', label: 'Embed' },
  { value: 'link', label: 'Link' },
  { value: 'gallery', label: 'Galeri' },
]

export default function AdminPostsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)

  const { data, isLoading } = useQuery<PostsResponse>({
    queryKey: ['admin-posts', q, category, type, page],
    queryFn: () =>
      api.get('/api/admin/posts', { params: { q, category, type, page, limit: 50 } }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
    staleTime: 60_000,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/posts/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-posts'] })
    },
  })

  const pinMut = useMutation({
    mutationFn: (id: string) => api.put(`/api/admin/posts/${id}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-posts'] }),
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">İçerikler</h1>
        {data && (
          <span className="text-sm text-muted">{data.total.toLocaleString('tr-TR')} içerik</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Başlık ara..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary shrink-0"
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={e => { setType(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary shrink-0"
        >
          {POST_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Başlık</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Yazar</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">Tip</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden xl:table-cell">Tarih</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden xl:table-cell">♥</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data?.data.map(post => (
                  <tr key={post.id} className="hover:bg-border/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[180px] lg:max-w-xs">
                        {post.pinned && <span className="text-primary mr-1">📌</span>}
                        {post.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">
                      {post.user?.username ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">
                      {post.category ? `${post.category.icon} ${post.category.name}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs bg-border/60 text-muted px-2 py-0.5 rounded">
                        {post.post_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted hidden xl:table-cell">
                      {relativeTime(post.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted text-right hidden xl:table-cell">
                      {post.like_count}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/post/${post.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted hover:text-white hover:bg-border transition-colors"
                          title="Görüntüle"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => pinMut.mutate(post.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            post.pinned
                              ? 'text-primary bg-primary/10'
                              : 'text-muted hover:text-primary hover:bg-primary/10'
                          }`}
                          title={post.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(post)}
                          className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.data.length === 0 && (
              <p className="text-center text-sm text-muted py-10">İçerik bulunamadı.</p>
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
          <span className="text-sm text-muted px-2">{page} / {totalPages}</span>
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
        title="İçeriği sil"
        description={`"${deleteTarget?.title}" içeriği kalıcı olarak silinecek.`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
