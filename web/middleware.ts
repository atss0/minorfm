import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']
const ADMIN_ROLES = ['admin', 'moderator']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Admin routes — completely separate auth ───────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    const adminLoggedIn = request.cookies.has('admin_logged_in')
    if (!adminLoggedIn) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const adminRole = request.cookies.get('admin_role')?.value ?? ''
    if (!ADMIN_ROLES.includes(adminRole)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // ─── Main site routes ──────────────────────────────────────────────────────
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const loggedIn = request.cookies.has('logged_in')

  if (!loggedIn && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (loggedIn && isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)'],
}
