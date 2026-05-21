'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Tag,
  Radio,
  Ticket,
  ArrowLeft,
} from 'lucide-react'

const NAV = [
  { href: '/admin',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/users',      label: 'Kullanıcılar', icon: Users },
  { href: '/admin/posts',      label: 'İçerikler',   icon: FileText },
  { href: '/admin/comments',   label: 'Yorumlar',    icon: MessageSquare },
  { href: '/admin/categories', label: 'Kategoriler', icon: Tag },
  { href: '/admin/radio',      label: 'Radyo',       icon: Radio },
  { href: '/admin/invites',    label: 'Davetler',    icon: Ticket },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full bg-surface border-r border-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <span className="font-black text-lg tracking-tight">
          M<span className="text-primary">İ</span>NOR
          <span className="text-muted font-light">.fm</span>
        </span>
        <p className="text-xs text-muted mt-0.5">Yönetim Paneli</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-white hover:bg-border/60'
            }`}
          >
            <Icon size={16} strokeWidth={isActive(href) ? 2.5 : 2} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Back to site */}
      <div className="p-3 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-border/60 transition-colors"
        >
          <ArrowLeft size={15} />
          Siteye Dön
        </Link>
      </div>
    </aside>
  )
}
