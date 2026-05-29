import { Suspense } from 'react'
import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'

export const metadata = { title: 'Kayıt Ol — MINOR.fm' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <img src="/logo.svg" alt="MINOR.fm" className="h-7 w-auto" />
          </Link>
          <p className="text-muted mt-2 text-sm">Yeni hesap oluştur</p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse bg-surface rounded-xl" />}>
          <RegisterForm />
        </Suspense>

        <p className="text-center text-muted text-sm">
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
