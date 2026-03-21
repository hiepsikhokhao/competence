import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/lib/types'

const rolePathMap: Record<UserRole, string> = {
  hr:       '/hr',
  manager:  '/manager',
  employee: '/employee',
}

// Which top-level path segment each role is allowed to access
const roleSegment: Record<UserRole, string> = {
  hr:       'hr',
  manager:  'manager',
  employee: 'employee',
}

export async function proxy(request: NextRequest) {
  // Carry any cookie mutations (token refreshes) through to the response.
  // Per @supabase/ssr docs: rebuild supabaseResponse inside setAll so
  // refreshed tokens are written to the outgoing response.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Optimistic auth check — reads JWT from cookie, no network request.
  // Do NOT use getUser() here; proxy runs on every request including prefetches.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isAuthenticated = !!session

  // ── Public routes ───────────────────────────────────────────────────────────

  if (pathname === '/login') {
    if (isAuthenticated) {
      const role = request.cookies.get('user-role')?.value as UserRole | undefined
      const dest = role ? rolePathMap[role] : null
      if (dest) {
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }
    return supabaseResponse
  }

  // ── Root → redirect based on auth state ────────────────────────────────────

  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const role = request.cookies.get('user-role')?.value as UserRole | undefined
    const dest = role ? rolePathMap[role] : '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // ── Protected routes (/hr, /manager, /employee) ─────────────────────────────

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = request.cookies.get('user-role')?.value as UserRole | undefined

  if (role) {
    const allowedSegment = roleSegment[role]
    const firstSegment = pathname.split('/')[1] // e.g. 'hr', 'manager', 'employee'

    const isProtectedSegment = ['hr', 'manager', 'employee'].includes(firstSegment)

    if (isProtectedSegment && firstSegment !== allowedSegment) {
      // User is trying to access a section they don't belong to
      return NextResponse.redirect(new URL(rolePathMap[role], request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
