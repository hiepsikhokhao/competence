import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { UserRole } from '@/lib/types'

const rolePathMap: Record<UserRole, string> = {
  hr:       '/hr',
  manager:  '/manager',
  employee: '/employee',
}

const protectedSegments = new Set(['hr', 'manager', 'employee'])

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
  const isAuthenticated = !!token
  const role = token?.role as UserRole | undefined

  const { pathname } = request.nextUrl

  // ── Public routes ───────────────────────────────────────────────────────────

  if (pathname === '/login') {
    if (isAuthenticated && role) {
      return NextResponse.redirect(new URL(rolePathMap[role], request.url))
    }
    return NextResponse.next()
  }

  // ── Root → redirect based on auth state ────────────────────────────────────

  if (pathname === '/') {
    if (!isAuthenticated || !role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.redirect(new URL(rolePathMap[role], request.url))
  }

  // ── Protected routes (/hr, /manager, /employee) ───────────────────────────

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (role) {
    const firstSegment = pathname.split('/')[1]
    if (protectedSegments.has(firstSegment) && firstSegment !== role) {
      return NextResponse.redirect(new URL(rolePathMap[role], request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
