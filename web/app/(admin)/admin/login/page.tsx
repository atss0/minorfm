'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useAdminAuthStore } from '@/store/adminAuthStore'

const ALLOWED_ROLES = ['admin', 'moderator']

export default function AdminLoginPage() {
  const router = useRouter()
  const { setAuth } = useAdminAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const { data } = await axios.post(`${base}/api/auth/login`, { email, password })

      if (!ALLOWED_ROLES.includes(data.user?.role)) {
        setError('Bu hesabın yönetim paneli erişimi yok.')
        setLoading(false)
        return
      }

      setAuth(data.user, data.access_token, data.refresh_token)
      router.replace('/admin')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Giriş başarısız. E-posta ve şifreyi kontrol edin.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="font-black text-2xl tracking-tight">
            M<span className="text-primary">İ</span>NOR
            <span className="text-muted font-light">.fm</span>
          </span>
          <p className="text-xs text-muted mt-1 uppercase tracking-widest">Yönetim Paneli</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4" noValidate>
          <p className="text-sm font-semibold text-white">Yönetici Girişi</p>

          {error && (
            <div className="bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted mb-1 block" htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="ornek@email.com"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block" htmlFor="password">Şifre</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-center text-xs text-muted">
          <a href="/" className="hover:text-white transition-colors">← Siteye dön</a>
        </p>
      </div>
    </div>
  )
}
