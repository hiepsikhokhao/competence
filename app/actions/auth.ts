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

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .single()

  if (profileError || !profile) {
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
