'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const schema = z
  .object({
    password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/api/auth/reset-password', { token, new_password: data.password })
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Geçersiz veya süresi dolmuş bağlantı'
      setError('root', { message: msg })
    }
  }

  if (done) {
    return (
      <div className="bg-surface border border-border rounded-xl px-6 py-8 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h2 className="text-white font-semibold">Şifre güncellendi</h2>
        <p className="text-sm text-muted">Giriş sayfasına yönlendiriliyorsun…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="password">
          Yeni şifre
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-primary">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="confirm">
          Şifreyi tekrarla
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...register('confirm')}
          className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          placeholder="••••••••"
        />
        {errors.confirm && (
          <p className="mt-1 text-xs text-primary">{errors.confirm.message}</p>
        )}
      </div>

      {errors.root && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5">
          <p className="text-sm text-primary">{errors.root.message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {isSubmitting ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
      </button>
    </form>
  )
}
