'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthOrError } from '@/lib/auth-helpers'
import type { ProficiencyLevel } from '@/lib/types'

// ── Save a single manager score (auto-save) ───────────────────────────────────

export async function saveManagerScore(
  assessmentId: string,
  skillId: string,
  managerScore: ProficiencyLevel,
): Promise<{ error?: string }> {
  const { user, error } = await getAuthOrError()
  if (error) return { error }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, managerStatus: true, employeeId: true },
  })

  if (!assessment) return { error: 'Assessment not found' }
  if (assessment.managerStatus === 'reviewed') return { error: 'Review already submitted' }

  // Verify manager-employee relationship
  const employee = await prisma.user.findFirst({
    where: { id: assessment.employeeId, managerId: user.id },
    select: { id: true },
  })

  if (!employee) return { error: 'Not authorized to review this assessment' }

  await prisma.assessmentScore.upsert({
    where: { assessmentId_skillId: { assessmentId, skillId } },
    update: { managerScore },
    create: { assessmentId, skillId, managerScore },
  })

  return {}
}

// ── Submit manager review (lock, finalize scores) ─────────────────────────────

export async function submitManagerReview(
  assessmentId: string,
): Promise<{ error?: string }> {
  const { user, error } = await getAuthOrError()
  if (error) return { error }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, employeeId: true },
  })

  if (!assessment) return { error: 'Assessment not found' }

  const employee = await prisma.user.findFirst({
    where: { id: assessment.employeeId, managerId: user.id },
    select: { id: true },
  })

  if (!employee) return { error: 'Not authorized to review this assessment' }

  const result = await prisma.assessment.updateMany({
    where: { id: assessmentId, managerStatus: 'pending' },
    data: {
      managerStatus: 'reviewed',
      managerReviewedAt: new Date(),
    },
  })

  if (result.count === 0) return { error: 'Review already submitted' }

  revalidatePath('/manager')
  revalidatePath('/employee')
  return {}
}
