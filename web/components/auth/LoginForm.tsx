'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifre gereklidir'),
})

type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/api/auth/login', data)
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token)
      const next = searchParams.get('next') ?? '/'
      // Hard navigation ensures the logged_in cookie is included in the
      // server request before middleware runs its auth check.
      window.location.href = next
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Giriş başarısız, tekrar dene'
      setError('root', { message: msg })
    }
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

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="password">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-primary">{errors.password.message}</p>
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
        {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  )
}
