import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Browser client ───────────────────────────────────────────────────────────
// Use in Client Components ('use client'). Creates one instance per call;
// wrap in useMemo or a singleton if re-renders are a concern.

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// ─── Server client ────────────────────────────────────────────────────────────
// Use in Server Components, Route Handlers, and Server Actions.
// cookies() is async in Next.js 16+.

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // setAll is only honoured inside Server Actions / Route Handlers;
        // it is silently ignored during Server Component rendering.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // No-op when called from a read-only Server Component context.
        }
      },
    },
  })
}
