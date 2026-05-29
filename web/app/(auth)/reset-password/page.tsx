import Link from 'next/link'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata = { title: 'Şifre Sıfırla — MINOR.fm' }

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-primary font-semibold">Geçersiz bağlantı</p>
          <Link href="/forgot-password" className="text-sm text-muted hover:text-white underline">
            Yeni bağlantı iste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <img src="/logo.svg" alt="MINOR.fm" className="h-7 w-auto" />
          </Link>
          <p className="text-muted mt-2 text-sm">Yeni şifreni belirle</p>
        </div>

        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}
