'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import RoleBadge from '@/components/admin/RoleBadge'
import { relativeTime } from '@/lib/time'
import type { Comment } from '@/types'

interface CommentsResponse {
  data: Comment[]
  total: number
  page: number
  limit: number
}

export default function AdminCommentsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null)

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: ['admin-comments', page],
    queryFn: () =>
      api.get('/api/admin/comments', { params: { page, limit: 50 } }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/comments/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-comments'] })
    },
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Yorumlar</h1>
        {data && (
          <span className="text-sm text-muted">{data.total.toLocaleString('tr-TR')} yorum</span>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 border-b border-border/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Yorum
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">
                    Kullanıcı
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">
                    Tarih
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data?.data.map(comment => (
                  <tr key={comment.id} className="hover:bg-border/20 transition-colors">
                    <td className="px-4 py-3 max-w-xs lg:max-w-sm">
                      <p className="text-white text-sm leading-snug line-clamp-2">{comment.body}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">{comment.user?.username ?? '—'}</span>
                        {comment.user?.role && comment.user.role !== 'user' && (
                          <RoleBadge role={comment.user.role} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted hidden lg:table-cell">
                      {relativeTime(comment.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/post/${comment.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted hover:text-white hover:bg-border transition-colors"
                          title="Postu görüntüle"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(comment)}
                          className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Yorumu sil"
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
              <p className="text-center text-sm text-muted py-10">Yorum bulunamadı.</p>
            )}
          </div>
        )}
      </div>

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
        title="Yorumu sil"
        description="Bu yorum kalıcı olarak silinecek."
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
