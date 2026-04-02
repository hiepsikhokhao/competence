import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { UserRole } from '@prisma/client'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user as { id: string; name: string; email: string; role: UserRole }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (user.role !== role) redirect('/login')
  return user
}

export async function getAuthOrError() {
  const user = await getCurrentUser()
  if (!user) return { user: null as never, error: 'Not authenticated' as const }
  return { user, error: null }
}

export async function requireHrOrError() {
  const { user, error } = await getAuthOrError()
  if (error) return { user: null as never, error }
  if (user.role !== 'hr') return { user: null as never, error: 'Not authorized' as const }
  return { user, error: null }
}
