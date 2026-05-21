'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, Upload, Plus, Trash2, Youtube } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import Cropper, { Area } from 'react-easy-crop' // EKLENDİ
import api from '@/lib/api'
import type { Category, Post, PaginatedResponse } from '@/types'

// ─── Canvas Kırpma Yardımcısı (EKLENDİ) ──────────────────────────────────────

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('2D context oluşturulamadı')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas boş'))
        return
      }
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
      resolve(file)
    }, 'image/jpeg', 0.9)
  })
}

// ─── Kırpma Modalı Bileşeni (EKLENDİ) ─────────────────────────────────────────

function CropModal({
  imageSrc,
  aspect,
  onCropDone,
  onCancel,
}: {
  imageSrc: string
  aspect: number
  onCropDone: (file: File) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropDone(croppedFile)
    } catch (e) {
      console.error(e)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="p-4 bg-surface border-t border-border flex gap-3">
        <button
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-3 rounded-xl bg-border text-white font-medium hover:bg-border/80 transition"
        >
          İptal
        </button>
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition"
        >
          {processing ? 'İşleniyor...' : 'Kırp ve Ekle'}
        </button>
      </div>
    </div>
  )
}


// ─── Category config ──────────────────────────────────────────────────────────

type FormKind = 'article' | 'cover_article' | 'embed' | 'gallery' | 'poll'

interface CategoryConfig {
  kind: FormKind
  postType: string
  label: string
  placeholder?: string
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  hiperfokus: { kind: 'gallery', postType: 'gallery', label: 'Fotoğraf paylaş' },
  dipses: { kind: 'embed', postType: 'embed', label: 'Müzik paylaş', placeholder: 'YouTube bağlantısı' },
  sinemaskop: { kind: 'cover_article', postType: 'article', label: 'İçerik paylaş' },
  okuryazar: { kind: 'cover_article', postType: 'article', label: 'Yazı yaz' },
  sualite: { kind: 'cover_article', postType: 'article', label: 'Tartışma başlat' },
  hemfikir: { kind: 'poll', postType: 'poll', label: 'Anket oluştur' },
  sinedump: { kind: 'gallery', postType: 'gallery', label: 'Sahne ekle' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/\s]+)/)
  return m?.[1] ?? null
}

function toEmbedUrl(url: string): string {
  const id = extractYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : url
}

// ─── Shared field ─────────────────────────────────────────────────────────────

function TitleField({
  value, onChange, error, placeholder = 'Başlık',
}: { value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
      />
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  )
}

function BodyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={5}
      placeholder="İçerik (Markdown desteklenir)…"
      className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
    />
  )
}

// ─── Article form ─────────────────────────────────────────────────────────────
// (Burası aynı kaldı)
const articleSchema = z.object({
  title: z.string().min(3, 'En az 3 karakter').max(200),
  body: z.string().optional(),
})
type ArticleData = z.infer<typeof articleSchema>

function ArticleForm({ categoryId, postType, onSuccess }: FormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<ArticleData>({
    resolver: zodResolver(articleSchema),
  })

  const onSubmit = async (data: ArticleData) => {
    try {
      const res = await api.post('/api/posts', { ...data, category_id: categoryId, post_type: postType })
      onSuccess(res.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata oluştu'
      setError('root', { message: msg })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <input
          {...register('title')}
          placeholder="Başlık"
          className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
        />
        {errors.title && <p className="mt-1 text-xs text-primary">{errors.title.message}</p>}
      </div>
      <textarea
        {...register('body')}
        rows={5}
        placeholder="İçerik (Markdown desteklenir)…"
        className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
      />
      {errors.root && <p className="text-xs text-primary">{errors.root.message}</p>}
      <SubmitBtn loading={isSubmitting} />
    </form>
  )
}

// ─── Cover article form (GÜNCELLENDİ: 16:9 Sabit Kırpma) ──────────────────────

function CoverArticleForm({ categoryId, postType, onSuccess }: FormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  const [cropSrc, setCropSrc] = useState<string | null>(null) // EKLENDİ
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 1. Dosya seçilince önce Crop moduna alıyoruz
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCropSrc(url)
    }
    // Seçimi sıfırla ki aynı dosyayı bir daha seçebilsin
    if (fileRef.current) fileRef.current.value = ''
  }

  // 2. Kırpma bitince yüklemeyi başlat
  const uploadCover = async (file: File) => {
    setCropSrc(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' } // <--- ÇÖZÜM BURADA
      })
      setCoverUrl(res.data.url)
    } catch {
      setError('Görsel yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Başlık zorunlu'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/api/posts', {
        title,
        body,
        category_id: categoryId,
        post_type: postType,
        metadata: coverUrl ? { cover_url: coverUrl } : undefined,
      })
      onSuccess(res.data)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          aspect={16 / 9} // KAPAK İÇİN 16:9 SABİT ORAN
          onCropDone={uploadCover}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <TitleField value={title} onChange={setTitle} error={!title && error === 'Başlık zorunlu' ? error : undefined} />

        {/* Cover */}
        <div>
          {coverUrl ? (
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-border group">
              <Image src={coverUrl} alt="Kapak" fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => setCoverUrl('')}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-border hover:border-muted/60 rounded-lg py-6 flex flex-col items-center gap-2 text-muted hover:text-white transition-colors disabled:opacity-60"
            >
              <Upload size={20} />
              <span className="text-sm">{uploading ? 'Yükleniyor…' : 'Kapak fotoğrafı ekle'}</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <BodyField value={body} onChange={setBody} />
        {error && error !== 'Başlık zorunlu' && <p className="text-xs text-primary">{error}</p>}
        <SubmitBtn loading={submitting} />
      </form>
    </>
  )
}

// ─── Embed form ───────────────────────────────────────────────────────────────
// (Burası aynı kaldı)
function EmbedForm({ categoryId, postType, onSuccess, placeholder }: FormProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const videoId = extractYouTubeId(url)
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Başlık zorunlu'); return }
    if (!url.trim()) { setError('Bağlantı zorunlu'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/api/posts', {
        title,
        category_id: categoryId,
        post_type: postType,
        metadata: { url, embed_url: toEmbedUrl(url), video_id: videoId },
      })
      onSuccess(res.data)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TitleField value={title} onChange={setTitle} />
      <div>
        <div className="flex items-center gap-2 bg-bg border border-border rounded-lg px-4 py-2.5 focus-within:border-primary transition-colors">
          <Youtube size={16} className="text-muted shrink-0" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder ?? 'YouTube veya video bağlantısı'}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted outline-none"
          />
        </div>
      </div>
      {thumbnail && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-border">
          <Image src={thumbnail} alt="Önizleme" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-2xl ml-0.5">▶</span>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-primary">{error}</p>}
      <SubmitBtn loading={submitting} />
    </form>
  )
}

// ─── Gallery form (GÜNCELLENDİ: 1:1 Sabit Kare Kırpma) ───────────────────────

function GalleryForm({ categoryId, postType, onSuccess }: FormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])

  const [cropSrc, setCropSrc] = useState<string | null>(null) // EKLENDİ
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 1. Dosya seçilince kırpma modunu aç
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCropSrc(url)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  // 2. Kırpılan dosyayı doğrudan sunucuya yükle
  const uploadSingleFile = async (file: File) => {
    setCropSrc(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/api/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImages((prev) => [...prev, res.data.url])
    } catch (err: any) {
      console.error("Yükleme Hatası:", err.response?.data || err.message || err);
      setError('Görsel yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Başlık zorunlu'); return }
    if (images.length === 0) { setError('En az bir fotoğraf ekle'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/api/posts', {
        title,
        body,
        category_id: categoryId,
        post_type: postType,
        metadata: { images },
      })
      onSuccess(res.data)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          aspect={1} // GALERİ İÇİ SADECE 1:1 KARE
          onCropDone={uploadSingleFile}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <TitleField value={title} onChange={setTitle} />

        {/* Image grid */}
        <div className="grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-border group">
              <Image src={src} alt={`Görsel ${i + 1}`} fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} className="text-white" />
              </button>
            </div>
          ))}
          {images.length < 4 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-muted/60 flex flex-col items-center justify-center gap-1 text-muted hover:text-white transition-colors disabled:opacity-60"
            >
              {uploading ? (
                <span className="text-xs">Yükleniyor…</span>
              ) : (
                <>
                  <Plus size={20} />
                  <span className="text-xs">Ekle</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Çoklu seçim kaldırıldı (multiple="false"), her seçimde kırpılacak */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <BodyField value={body} onChange={setBody} />
        {error && <p className="text-xs text-primary">{error}</p>}
        <SubmitBtn loading={submitting} />
      </form>
    </>
  )
}

// ─── Poll form ────────────────────────────────────────────────────────────────
// (Burası aynı kaldı)
function PollForm({ categoryId, onSuccess }: FormProps) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const setOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const opts = options.filter((o) => o.trim())
    if (!title.trim()) { setError('Soru zorunlu'); return }
    if (opts.length < 2) { setError('En az 2 seçenek gerekli'); return }
    setSubmitting(true)
    setError('')
    try {
      const postRes = await api.post('/api/posts', {
        title,
        category_id: categoryId,
        post_type: 'poll',
        metadata: { options: opts.map((text) => ({ text, votes: 0 })), total_votes: 0 },
      })
      await api.post(`/api/posts/${postRes.data.id}/poll`, { options: opts.map((text) => ({ text })) })
      onSuccess(postRes.data)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TitleField value={title} onChange={setTitle} placeholder="Soru…" />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Seçenek ${i + 1}`}
              className="flex-1 bg-bg border border-border rounded-lg px-4 py-2 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted hover:text-primary transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ''])}
            className="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors"
          >
            <Plus size={12} /> Seçenek ekle
          </button>
        )}
      </div>

      {error && <p className="text-xs text-primary">{error}</p>}
      <SubmitBtn loading={submitting} />
    </form>
  )
}

// ─── Submit button ─────────────────────────────────────────────────────────────
// (Aynı)
function SubmitBtn({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
    >
      {loading ? 'Paylaşılıyor…' : 'Paylaş'}
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
// (Aynı)
interface FormProps {
  categoryId: number
  postType: string
  onSuccess: (post: Post) => void
  placeholder?: string
}

interface Props {
  category: Category
  onClose: () => void
}

export default function CreatePostModal({ category, onClose }: Props) {
  const qc = useQueryClient()
  const cfg = CATEGORY_CONFIG[category.slug]

  const handleSuccess = (newPost: Post) => {
    qc.setQueriesData<InfiniteData<PaginatedResponse<Post>>>(
      {
        queryKey: ['posts-feed'],
        predicate: (query) => {
          const params = (query.queryKey[1] as { category?: string } | undefined) ?? {}
          return !params.category || params.category === category.slug
        },
      },
      (old) => {
        if (!old?.pages?.length) return old
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              data: [newPost, ...old.pages[0].data],
              total: old.pages[0].total + 1,
            },
            ...old.pages.slice(1),
          ],
        }
      }
    )
    qc.invalidateQueries({ queryKey: ['posts-feed'] })
    onClose()
  }

  if (!cfg) return null

  const formProps: FormProps = {
    categoryId: category.id,
    postType: cfg.postType,
    onSuccess: handleSuccess,
    placeholder: cfg.placeholder,
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg">{category.icon}</span>
            <span className="font-semibold text-white text-sm">{cfg.label}</span>
            <span className="text-xs text-muted">· {category.name}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {cfg.kind === 'article' && <ArticleForm {...formProps} />}
          {cfg.kind === 'cover_article' && <CoverArticleForm {...formProps} />}
          {cfg.kind === 'embed' && <EmbedForm {...formProps} />}
          {cfg.kind === 'gallery' && <GalleryForm {...formProps} />}
          {cfg.kind === 'poll' && <PollForm {...formProps} />}
        </div>
      </div>
    </div>
  )
}