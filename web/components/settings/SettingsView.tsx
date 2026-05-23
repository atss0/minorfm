'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, User, Lock, Bell, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { globalLogout } from '@/store/globalLogout'
import api from '@/lib/api'

// --- Profile form ---
const profileSchema = z.object({
  username: z.string().min(2, 'En az 2 karakter').max(32, 'En fazla 32 karakter'),
  bio: z.string().max(160, 'En fazla 160 karakter').optional(),
})
type ProfileFormData = z.infer<typeof profileSchema>

// --- Password form ---
const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Mevcut şifre gerekli'),
    new_password: z.string().min(8, 'En az 8 karakter'),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirm'],
  })
type PasswordFormData = z.infer<typeof passwordSchema>

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-white font-semibold text-sm mb-4">
      {icon}
      {label}
    </div>
  )
}

function AvatarSection() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await api.post('/api/media/avatar', form)
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, avatar_url: res.data.avatar_url }, accessToken, refreshToken)
      }
    } catch {
      setError('Yükleme başarısız, tekrar dene')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="bg-surface border border-border rounded-xl p-5">
      <SectionTitle icon={<Camera size={16} />} label="Profil fotoğrafı" />
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-border shrink-0">
          {user?.avatar_url ? (
            <Image src={user.avatar_url} alt={user.username} fill className="object-contain" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <User size={28} className="text-muted" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-sm font-semibold text-white bg-border hover:bg-border/80 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors"
          >
            {uploading ? 'Yükleniyor…' : 'Fotoğraf değiştir'}
          </button>
          <p className="text-xs text-muted">JPG, PNG veya WebP — max 5 MB</p>
          {error && <p className="text-xs text-primary">{error}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </section>
  )
}

function ProfileSection() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username ?? '', bio: user?.bio ?? '' },
  })

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const res = await api.put('/api/users/me', data)
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, ...res.data }, accessToken, refreshToken)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız'
      setError('root', { message: msg })
    }
  }

  return (
    <section className="bg-surface border border-border rounded-xl p-5">
      <SectionTitle icon={<User size={16} />} label="Profil bilgileri" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs text-muted mb-1.5">Kullanıcı adı</label>
          <input
            {...register('username')}
            className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          />
          {errors.username && <p className="mt-1 text-xs text-primary">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Biyografi</label>
          <textarea
            {...register('bio')}
            rows={3}
            className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
            placeholder="Kendinden bahset…"
          />
          {errors.bio && <p className="mt-1 text-xs text-primary">{errors.bio.message}</p>}
        </div>
        {errors.root && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
            <p className="text-sm text-primary">{errors.root.message}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5">
            <p className="text-sm text-green-400">Profil güncellendi</p>
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg transition-colors text-sm"
        >
          {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>
    </section>
  )
}

function PasswordSection() {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async (data: PasswordFormData) => {
    try {
      await api.put('/api/users/me/password', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      reset()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız'
      setError('root', { message: msg })
    }
  }

  return (
    <section className="bg-surface border border-border rounded-xl p-5">
      <SectionTitle icon={<Lock size={16} />} label="Şifre değiştir" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {(['current_password', 'new_password', 'confirm'] as const).map((field) => (
          <div key={field}>
            <label className="block text-xs text-muted mb-1.5">
              {field === 'current_password'
                ? 'Mevcut şifre'
                : field === 'new_password'
                ? 'Yeni şifre'
                : 'Yeni şifre (tekrar)'}
            </label>
            <input
              type="password"
              autoComplete={field === 'current_password' ? 'current-password' : 'new-password'}
              {...register(field)}
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
            {errors[field] && <p className="mt-1 text-xs text-primary">{errors[field]!.message}</p>}
          </div>
        ))}
        {errors.root && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
            <p className="text-sm text-primary">{errors.root.message}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5">
            <p className="text-sm text-green-400">Şifre güncellendi</p>
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg transition-colors text-sm"
        >
          {isSubmitting ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
        </button>
      </form>
    </section>
  )
}

function NotificationsSection() {
  const [emailNotif, setEmailNotif] = useState(true)
  const [chatSound, setChatSound] = useState(true)

  return (
    <section className="bg-surface border border-border rounded-xl p-5">
      <SectionTitle icon={<Bell size={16} />} label="Bildirim tercihleri" />
      <div className="space-y-3">
        {[
          { label: 'E-posta bildirimleri', desc: 'Yeni takipçi ve yorum bildirimlerini e-posta ile al', value: emailNotif, toggle: () => setEmailNotif((v) => !v) },
          { label: 'Sohbet sesi', desc: 'Yeni mesaj geldiğinde ses çal', value: chatSound, toggle: () => setChatSound((v) => !v) },
        ].map(({ label, desc, value, toggle }) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">{label}</p>
              <p className="text-xs text-muted mt-0.5">{desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={value}
              onClick={toggle}
              className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                value ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform mt-[3px] ${
                  value ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function DangerZone() {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return }
    setDeleting(true)
    try {
      await api.delete('/api/users/me')
      globalLogout()
    } catch {
      setDeleting(false)
      setConfirm(false)
    }
  }

  return (
    <section className="bg-surface border border-primary/20 rounded-xl p-5">
      <SectionTitle icon={<Trash2 size={16} className="text-primary" />} label="Tehlike bölgesi" />
      <p className="text-sm text-muted mb-4">
        Hesabını silersen tüm içeriklerin ve verilerinin kalıcı olarak kaldırılır.
      </p>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm font-semibold text-primary border border-primary/40 hover:bg-primary hover:text-white disabled:opacity-60 px-4 py-2 rounded-lg transition-colors"
      >
        {deleting ? 'Siliniyor…' : confirm ? 'Emin misin? Tekrar tıkla' : 'Hesabı sil'}
      </button>
    </section>
  )
}

export default function SettingsView() {
  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Ayarlar</h1>
      <AvatarSection />
      <ProfileSection />
      <PasswordSection />
      <NotificationsSection />
      <DangerZone />
    </div>
  )
}
