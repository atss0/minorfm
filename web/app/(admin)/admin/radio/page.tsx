'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, SkipForward, Trash2, Plus, Music, X, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import api from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import type { Track } from '@/types'

interface RadioState {
  track: Track | null
  is_playing: boolean
}

// ─── Sortable track row ────────────────────────────────────────────────────────

function SortableTrackRow({
  track,
  onDelete,
}: {
  track: Track
  onDelete: (t: Track) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id })

  const isLive = track.duration === 0
  const mins = Math.floor(track.duration / 60)
  const secs = String(track.duration % 60).padStart(2, '0')

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-border/20 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted hover:text-white cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical size={16} />
      </button>
      {track.cover_url ? (
        <Image
          src={track.cover_url}
          alt={track.title}
          width={36}
          height={36}
          className="rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded bg-border flex items-center justify-center shrink-0">
          <Music size={14} className="text-muted" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.title}</p>
        <p className="text-xs text-muted truncate">{track.artist || '—'}</p>
      </div>
      <span className="text-xs text-muted shrink-0">{isLive ? 'CANLI' : `${mins}:${secs}`}</span>
      <button
        onClick={() => onDelete(track)}
        className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
        title="Parçayı sil"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: '', artist: '', cover_url: '', stream_url: '', duration: '' }

export default function AdminRadioPage() {
  const qc = useQueryClient()
  const [tracks, setTracks] = useState<Track[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [addError, setAddError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const { data: current } = useQuery<RadioState>({
    queryKey: ['radio-current-admin'],
    queryFn: () => api.get('/api/radio/current').then(r => r.data),
    refetchInterval: 10_000,
  })

  const { data: queue, isLoading } = useQuery<{ data: Track[] }>({
    queryKey: ['radio-queue-admin'],
    queryFn: () => api.get('/api/radio/queue').then(r => r.data),
  })

  useEffect(() => {
    setTracks(queue?.data ?? [])
  }, [queue])

  const skipMut = useMutation({
    mutationFn: () => api.post('/api/admin/radio/skip'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radio-current-admin'] }),
  })

  const orderMut = useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) =>
      api.put(`/api/admin/radio/tracks/${id}/order`, { order }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/radio/tracks/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      setDeleteError('')
      qc.invalidateQueries({ queryKey: ['radio-queue-admin'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteError(msg ?? 'Silme işlemi başarısız oldu.')
    },
  })

  const addMut = useMutation({
    mutationFn: (body: { title: string; artist: string; cover_url: string; stream_url: string; duration: number }) =>
      api.post('/api/admin/radio/tracks', body),
    onSuccess: () => {
      setFormOpen(false)
      setForm(EMPTY_FORM)
      setAddError('')
      qc.invalidateQueries({ queryKey: ['radio-queue-admin'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAddError(msg ?? 'Parça eklenemedi. Bilgileri kontrol edin.')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = tracks.findIndex(t => t.id === active.id)
    const newIdx = tracks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tracks, oldIdx, newIdx)
    setTracks(reordered)
    reordered.forEach((t, idx) => {
      orderMut.mutate({ id: t.id, order: idx + 1 })
    })
  }

  const setField = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const formValid = form.title.trim() !== '' && form.stream_url.trim() !== '' &&
    (form.duration === '' || Number(form.duration) >= 0)

  const handleAdd = () => {
    if (!formValid) return
    setAddError('')
    addMut.mutate({
      title: form.title.trim(),
      artist: form.artist.trim(),
      cover_url: form.cover_url.trim(),
      stream_url: form.stream_url.trim(),
      duration: form.duration === '' ? 0 : Number(form.duration),
    })
  }

  const currentTrack = current?.track
  const isCurrentLive = currentTrack?.duration === 0
  const mins = currentTrack ? Math.floor(currentTrack.duration / 60) : 0
  const secs = currentTrack ? String(currentTrack.duration % 60).padStart(2, '0') : '00'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Radyo Yönetimi</h1>

      {/* Current track */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Şu An Çalıyor</p>
        {currentTrack ? (
          <div className="flex items-center gap-4">
            {currentTrack.cover_url ? (
              <Image
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                width={56}
                height={56}
                className="rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-border flex items-center justify-center shrink-0">
                <Music size={20} className="text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{currentTrack.title}</p>
              <p className="text-sm text-muted">{currentTrack.artist || '—'}</p>
              <p className="text-xs text-muted mt-0.5">{isCurrentLive ? 'Canlı Yayın' : `${mins}:${secs}`}</p>
            </div>
            <button
              onClick={() => skipMut.mutate()}
              disabled={skipMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:text-white hover:bg-border disabled:opacity-60 transition-colors shrink-0"
            >
              <SkipForward size={14} />
              Atla
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">Şu an çalan parça yok.</p>
        )}
      </div>

      {/* Add track form */}
      {formOpen ? (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Yeni Parça Ekle</p>
            <button onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); setAddError('') }} className="text-muted hover:text-white">
              <X size={16} />
            </button>
          </div>

          {addError && (
            <div className="flex items-start gap-2 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{addError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Başlık *</label>
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Sanatçı</label>
              <input
                value={form.artist}
                onChange={e => setField('artist', e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Stream URL *</label>
              <input
                value={form.stream_url}
                onChange={e => setField('stream_url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Süre (saniye) — boş = canlı yayın</label>
              <input
                type="number"
                min="0"
                value={form.duration}
                onChange={e => setField('duration', e.target.value)}
                placeholder="örn: 213 — boş bırak = canlı"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted mb-1 block">Cover URL</label>
              <input
                value={form.cover_url}
                onChange={e => setField('cover_url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); setAddError('') }}
              className="px-4 py-2 text-sm text-muted hover:text-white border border-border rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleAdd}
              disabled={!formValid || addMut.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 rounded-lg transition-colors"
            >
              {addMut.isPending ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Kuyruk {tracks.length > 0 && `(${tracks.length})`}
          </p>
          {!formOpen && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={14} />
              Parça Ekle
            </button>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 border-b border-border/50 animate-pulse" />
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-center text-sm text-muted py-10">Kuyruk boş.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tracks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tracks.map(track => (
                  <SortableTrackRow
                    key={track.id}
                    track={track}
                    onDelete={(t) => { setDeleteTarget(t); setDeleteError('') }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Parçayı sil"
        description={deleteError || `"${deleteTarget?.title}" parçası kuyruktan silinecek.`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
