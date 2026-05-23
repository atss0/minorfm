'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

const ALLOWED_ROLES = ['admin', 'moderator']

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp < Date.now() / 1000
  } catch {
    return true
  }
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, accessToken } = useAdminAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    // No user or wrong role → login
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      router.replace('/admin/login')
      return
    }
    // Token expired → redirect immediately instead of waiting for a 401
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace('/admin/login')
    }
  }, [mounted, user, accessToken, router])

  if (!mounted) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !ALLOWED_ROLES.includes(user.role) || !accessToken || isTokenExpired(accessToken)) return null

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
