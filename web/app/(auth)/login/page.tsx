import { Suspense } from 'react'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata = { title: 'Giriş Yap — MINOR.fm' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block font-black text-2xl tracking-tight">
            <img src="/logo.svg" alt="MINOR.fm" className="h-7 w-auto" />
          </Link>
          <p className="text-muted mt-2 text-sm">Hesabına giriş yap</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <div className="space-y-2 text-center">
          <p className="text-muted text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Şifremi unuttum
            </Link>
          </p>
          <p className="text-muted text-sm">
            Hesabın yok mu?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Kayıt ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
