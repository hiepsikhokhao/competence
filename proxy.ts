import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { UserRole } from '@/lib/types'

const rolePathMap: Record<UserRole, string> = {
  hr:       '/hr',
  manager:  '/manager',
  employee: '/employee',
}

const protectedSegments = new Set(['hr', 'manager', 'employee'])

/** 302 redirect with loop guard — passes through if target === current path */
function safeRedirect(url: URL, request: NextRequest) {
  if (url.pathname === request.nextUrl.pathname) {
    return NextResponse.next()
  }
  return NextResponse.redirect(url, 302)
}

export async function proxy(request: NextRequest) {
  const isSecure = request.headers.get('x-forwarded-proto') === 'https' ||
                   request.nextUrl.protocol === 'https:'
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecure,
  })
  const isAuthenticated = !!token
  const role = token?.role as UserRole | undefined

  const { pathname } = request.nextUrl

  // ── Public routes ───────────────────────────────────────────────────────────

  if (pathname === '/login') {
    if (isAuthenticated && role) {
      return safeRedirect(new URL(rolePathMap[role], request.url), request)
    }
    return NextResponse.next()
  }

  // ── Root → redirect based on auth state ────────────────────────────────────

  if (pathname === '/') {
    if (!isAuthenticated || !role) {
      return safeRedirect(new URL('/login', request.url), request)
    }
    return safeRedirect(new URL(rolePathMap[role], request.url), request)
  }

  // ── Protected routes (/hr, /manager, /employee) ───────────────────────────

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return safeRedirect(loginUrl, request)
  }

  if (role) {
    const firstSegment = pathname.split('/')[1]
    if (protectedSegments.has(firstSegment) && firstSegment !== role) {
      return safeRedirect(new URL(rolePathMap[role], request.url), request)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
