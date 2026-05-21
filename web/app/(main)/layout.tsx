import AppShell from '@/components/layout/AppShell'
import SessionGuard from '@/components/auth/SessionGuard'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionGuard>
      <AppShell>{children}</AppShell>
    </SessionGuard>
  )
}
