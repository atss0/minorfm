'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

const ALLOWED_ROLES = ['admin', 'moderator']

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAdminAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user !== null && !ALLOWED_ROLES.includes(user.role)) {
      router.replace('/admin/login')
    }
  }, [mounted, user, router])

  if (!mounted) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
