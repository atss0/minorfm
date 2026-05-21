'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/api/auth/forgot-password', data)
      setSent(true)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Bir hata oluştu, tekrar dene'
      setError('root', { message: msg })
    }
  }

  if (sent) {
    return (
      <div className="bg-surface border border-border rounded-xl px-6 py-8 text-center space-y-3">
        <div className="text-4xl">📬</div>
        <h2 className="text-white font-semibold">E-posta gönderildi</h2>
        <p className="text-sm text-muted">
          Şifre sıfırlama bağlantısı e-posta adresine gönderildi. Gelen kutunu kontrol et.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="email">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          placeholder="ornek@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-primary">{errors.email.message}</p>
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
        {isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
      </button>
    </form>
  )
}
