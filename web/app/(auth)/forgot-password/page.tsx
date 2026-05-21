import Link from 'next/link'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata = { title: 'Şifremi Unuttum — MINOR.fm' }

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block font-black text-2xl tracking-tight">
            M<span className="text-primary">İ</span>NOR
            <span className="text-muted font-light">.fm</span>
          </Link>
          <p className="text-muted mt-2 text-sm">
            E-posta adresini gir, sıfırlama bağlantısı gönderelim
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center text-muted text-sm">
          <Link href="/login" className="text-primary hover:underline">
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  )
}
