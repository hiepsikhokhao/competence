'use server'

import { signIn, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/types'

export type LoginState = { error: string } | null

const rolePathMap: Record<UserRole, string> = {
  hr:       '/hr',
  manager:  '/manager',
  employee: '/employee',
}

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
  } catch {
    return { error: 'Invalid email or password.' }
  }

  // Fetch role for redirect
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })

  const role = user?.role ?? 'employee'
  redirect(rolePathMap[role])
}

export async function logout() {
  await signOut({ redirect: false })
  redirect('/login')
}
