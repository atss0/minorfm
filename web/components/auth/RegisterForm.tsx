'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

const schema = z
  .object({
    inviteCode: z.string().min(1, 'Davet kodu gerekli').transform((v) => v.trim().toUpperCase()),
    username: z
      .string()
      .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
      .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir')
      .regex(/^[a-z0-9_]+$/, 'Sadece küçük harf, rakam ve alt çizgi kullanılabilir'),
    email: z.string().email('Geçerli bir e-posta adresi girin'),
    password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string
  id: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1.5" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const code = searchParams.get('invite')
    if (code) setValue('inviteCode', code.toUpperCase())
  }, [searchParams, setValue])

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/api/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        invite_code: data.inviteCode,
      })
      const res = await api.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      })
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token)
      window.location.href = '/'
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Kayıt başarısız, tekrar dene'
      setError('root', { message: msg })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Davet Kodu" id="inviteCode" error={errors.inviteCode?.message}>
        <input
          id="inviteCode"
          type="text"
          autoComplete="off"
          {...register('inviteCode')}
          className={`${inputCls} tracking-widest uppercase font-mono`}
          placeholder="XXXXXXXX"
          maxLength={8}
        />
      </Field>

      <Field label="Kullanıcı adı" id="username" error={errors.username?.message}>
        <input
          id="username"
          type="text"
          autoComplete="username"
          {...register('username')}
          className={inputCls}
          placeholder="kullanici_adi"
        />
      </Field>

      <Field label="E-posta" id="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className={inputCls}
          placeholder="ornek@email.com"
        />
      </Field>

      <Field label="Şifre" id="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className={inputCls}
          placeholder="En az 8 karakter"
        />
      </Field>

      <Field label="Şifre tekrar" id="confirmPassword" error={errors.confirmPassword?.message}>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>

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
        {isSubmitting ? 'Kaydediliyor...' : 'Kayıt Ol'}
      </button>
    </form>
  )
}
