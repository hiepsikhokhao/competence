'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthOrError } from '@/lib/auth-helpers'
import type { ProficiencyLevel } from '@/lib/types'

// ── Save a single skill score (auto-save draft) ───────────────────────────────

export async function saveScore(
  assessmentId: string,
  skillId: string,
  selfScore: ProficiencyLevel,
): Promise<{ error?: string }> {
  const { user, error } = await getAuthOrError()
  if (error) return { error }

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, employeeId: user.id },
    select: { id: true, selfStatus: true },
  })

  if (!assessment) return { error: 'Assessment not found' }
  if (assessment.selfStatus === 'submitted') return { error: 'Assessment already submitted' }

  await prisma.assessmentScore.upsert({
    where: { assessmentId_skillId: { assessmentId, skillId } },
    update: { selfScore },
    create: { assessmentId, skillId, selfScore },
  })

  // Advance status to 'draft' the first time a score is saved
  if (assessment.selfStatus === 'not_started') {
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { selfStatus: 'draft' },
    })
  }

  return {}
}

// ── Save evidence / example text for a single skill ──────────────────────────

export async function saveEvidence(
  assessmentId: string,
  skillId: string,
  evidence: string,
): Promise<{ error?: string }> {
  const { user, error } = await getAuthOrError()
  if (error) return { error }

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, employeeId: user.id },
    select: { id: true, selfStatus: true },
  })

  if (!assessment) return { error: 'Assessment not found' }
  if (assessment.selfStatus === 'submitted') return { error: 'Assessment already submitted' }

  await prisma.assessmentScore.upsert({
    where: { assessmentId_skillId: { assessmentId, skillId } },
    update: { evidence: evidence || null },
    create: { assessmentId, skillId, evidence: evidence || null },
  })

  return {}
}

// ── Submit assessment (lock form, trigger results view) ───────────────────────

export async function submitAssessment(
  assessmentId: string,
): Promise<{ error?: string }> {
  const { user, error } = await getAuthOrError()
  if (error) return { error }

  const result = await prisma.assessment.updateMany({
    where: {
      id: assessmentId,
      employeeId: user.id,
      selfStatus: { in: ['not_started', 'draft'] },
    },
    data: {
      selfStatus: 'submitted',
      selfSubmittedAt: new Date(),
    },
  })

  if (result.count === 0) return { error: 'Assessment not found or already submitted' }

  revalidatePath('/employee')
  revalidatePath('/manager')
  return {}
}
