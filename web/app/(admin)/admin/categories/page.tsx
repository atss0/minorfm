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
import { GripVertical, Plus, Pencil, Trash2, X } from 'lucide-react'
import api from '@/lib/adminApi'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import type { Category } from '@/types'

// ─── Sortable row ──────────────────────────────────────────────────────────────

function SortableRow({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id })

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
      <span className="text-xl shrink-0 w-7 text-center">{cat.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{cat.name}</p>
        <p className="text-xs text-muted font-mono">{cat.slug}</p>
      </div>
      <span className="text-xs text-muted hidden sm:block shrink-0 w-6 text-right">#{cat.order}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(cat)}
          className="p-1.5 rounded-md text-muted hover:text-white hover:bg-border transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(cat)}
          className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Form modal ────────────────────────────────────────────────────────────────

interface FormValues {
  name: string
  slug: string
  icon: string
  description: string
  order: number
}

function CategoryModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Category
  onSave: (v: FormValues) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormValues>({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    icon: initial?.icon ?? '',
    description: initial?.description ?? '',
    order: initial?.order ?? 0,
  })

  const set = (k: keyof FormValues, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const autoSlug = (name: string) =>
    name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white">{initial ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</p>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Ad</label>
            <input
              value={form.name}
              onChange={e => {
                set('name', e.target.value)
                if (!initial) set('slug', autoSlug(e.target.value))
              }}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Slug</label>
            <input
              value={form.slug}
              onChange={e => set('slug', e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">İkon (emoji)</label>
              <input
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                placeholder="🎵"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Sıra</label>
              <input
                type="number"
                value={form.order}
                onChange={e => set('order', Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Açıklama</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-white border border-border rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.slug}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [items, setItems] = useState<Category[]>([])
  const [editTarget, setEditTarget] = useState<Category | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
  })

  useEffect(() => {
    setItems(categories)
  }, [categories])

  const orderMut = useMutation({
    mutationFn: ({ id, order }: { id: number; order: number }) =>
      api.put(`/api/admin/categories/${id}`, { order }),
  })

  const createMut = useMutation({
    mutationFn: (body: FormValues) => api.post('/api/admin/categories', body),
    onSuccess: () => {
      setEditTarget(null)
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<FormValues> }) =>
      api.put(`/api/admin/categories/${id}`, body),
    onSuccess: () => {
      setEditTarget(null)
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/categories/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      setDeleteError('')
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDeleteError(msg ?? 'Bu kategori silinemedi.')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)
    setItems(reordered)
    reordered.forEach((cat, idx) => {
      orderMut.mutate({ id: cat.id, order: idx + 1 })
    })
  }

  const handleSave = (form: FormValues) => {
    if (editTarget === 'new') {
      createMut.mutate(form)
    } else if (editTarget !== null) {
      updateMut.mutate({ id: editTarget.id, body: form })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Kategoriler</h1>
        <button
          onClick={() => setEditTarget('new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} />
          Yeni Kategori
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 border-b border-border/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted py-10">Henüz kategori yok.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map(cat => (
                <SortableRow
                  key={cat.id}
                  cat={cat}
                  onEdit={setEditTarget}
                  onDelete={c => { setDeleteTarget(c); setDeleteError('') }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editTarget !== null && (
        <CategoryModal
          initial={editTarget === 'new' ? undefined : editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Kategoriyi sil"
        description={
          deleteError ||
          `"${deleteTarget?.name}" kategorisi silinecek. İçinde içerik varsa silme başarısız olur.`
        }
        onConfirm={() => { if (deleteTarget) { setDeleteError(''); deleteMut.mutate(deleteTarget.id) } }}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
