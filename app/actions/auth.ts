'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

export type LoginState = { error: string } | null

const rolePathMap: Record<UserRole, string> = {
  hr:       '/hr',
  manager:  '/manager',
  employee: '/employee',
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createServerSupabaseClient()

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { error: signInError.message }
  }

  // ── Get the verified auth user so we have the uid for the profile query ──────
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('[login] getUser result:', { uid: user?.id ?? null, userError })

  if (userError || !user) {
    console.error('[login] getUser failed:', userError)
    return { error: 'Could not verify session. Please try again.' }
  }

  // ── Fetch profile row — must filter by id, otherwise .single() blows up
  //    when the "authenticated can read all" RLS policy returns every row ────────
  console.log('[login] querying users where id =', user.id)
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('[login] profile query response:', { profile, profileError })

  if (profileError || !profile) {
    console.error('[login] profile fetch failed:', profileError)
    return { error: 'Could not load user profile. Please contact support.' }
  }

  const role = profile.role as UserRole

  // Store role in a cookie so proxy can make routing decisions without a DB call
  const cookieStore = await cookies()
  cookieStore.set('user-role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days — refreshed on each login
  })

  // redirect() throws internally; call it outside try/catch
  redirect(rolePathMap[role])
}

export async function logout() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('user-role')

  redirect('/login')
}
