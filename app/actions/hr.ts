'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireHrOrError } from '@/lib/auth-helpers'
import type { FunctionType, ProficiencyLevel, Skill, UserRole } from '@/lib/types'

function revalidateAll() {
  revalidatePath('/hr')
  revalidatePath('/employee')
  revalidatePath('/manager')
}

// ── Cycle ─────────────────────────────────────────────────────────────────────

export async function createCycle(
  name: string,
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    await prisma.cycle.create({ data: { name } })
    revalidatePath('/hr')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function openCycle(
  cycleId: string,
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    await prisma.cycle.update({
      where: { id: cycleId },
      data: { status: 'open', openedAt: new Date() },
    })
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function closeCycle(
  cycleId: string,
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    await prisma.cycle.update({
      where: { id: cycleId },
      data: { status: 'closed', closedAt: new Date() },
    })
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateUserManager(
  userId: string,
  managerId: string | null,
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    await prisma.user.update({
      where: { id: userId },
      data: { managerId },
    })
    revalidatePath('/hr')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

// ── Users / CSV import ────────────────────────────────────────────────────────

export type CsvUserRow = {
  name:          string
  email:         string
  role?:         string
  dept?:         string
  function?:     string
  job_level?:    string
  manager_email?: string
}

export type ImportResult = {
  updated: number
  skipped: number
  errors:  string[]
}

const VALID_ROLES:  UserRole[]    = ['employee', 'manager', 'hr']
const VALID_FUNCS: FunctionType[] = ['UA', 'MKT', 'LiveOps']

export async function importUsers(
  rows: CsvUserRow[],
): Promise<ImportResult> {
  const { error } = await requireHrOrError()
  if (error) return { updated: 0, skipped: 0, errors: [error] }

  const existing = await prisma.user.findMany({ select: { id: true, email: true } })
  const emailToId = Object.fromEntries(
    existing.map((u) => [u.email.toLowerCase(), u.id]),
  )

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    if (!row.email?.trim()) { skipped++; continue }

    const userId = emailToId[row.email.trim().toLowerCase()]
    if (!userId) {
      skipped++
      errors.push(`No account for ${row.email} — user must register first`)
      continue
    }

    const patch: Record<string, unknown> = {}
    if (row.name?.trim())                                            patch.name     = row.name.trim()
    if (row.dept?.trim())                                            patch.dept     = row.dept.trim()
    if (row.job_level?.trim())                                       patch.jobLevel = row.job_level.trim()
    if (row.role     && VALID_ROLES.includes(row.role as UserRole))         patch.role     = row.role
    if (row.function && VALID_FUNCS.includes(row.function as FunctionType)) patch.function = row.function

    if (row.manager_email?.trim()) {
      const managerId = emailToId[row.manager_email.trim().toLowerCase()]
      patch.managerId = managerId ?? null
      if (!managerId) errors.push(`Manager not found for ${row.email}: ${row.manager_email}`)
    }

    if (Object.keys(patch).length === 0) { skipped++; continue }

    try {
      await prisma.user.update({ where: { id: userId }, data: patch })
      updated++
    } catch (e) {
      errors.push(`${row.email}: ${(e as Error).message}`)
    }
  }

  revalidatePath('/hr')
  return { updated, skipped, errors }
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function createSkill(input: {
  name:       string
  definition: string | null
  function:   FunctionType
}): Promise<{ skill?: Skill; error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    const skill = await prisma.skill.create({
      data: { name: input.name, definition: input.definition, function: input.function },
    })
    revalidateAll()
    return { skill: { id: skill.id, name: skill.name, definition: skill.definition, function: skill.function } as Skill }
  } catch (e) { return { error: (e as Error).message } }
}

export async function updateSkill(
  id:    string,
  patch: { name: string; definition: string | null },
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    await prisma.skill.update({ where: { id }, data: patch })
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function deleteSkill(
  id: string,
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }
    await prisma.skill.delete({ where: { id } })
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

// ── Assessment revert ─────────────────────────────────────────────────────────

export async function revertAssessment(
  assessmentId: string,
  stage: 'manager' | 'self',
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }

    if (stage === 'manager') {
      await prisma.assessment.updateMany({
        where: { id: assessmentId, managerStatus: 'reviewed' },
        data: { managerStatus: 'pending', managerReviewedAt: null },
      })
    } else {
      await prisma.assessment.updateMany({
        where: { id: assessmentId, selfStatus: 'submitted' },
        data: { selfStatus: 'draft', selfSubmittedAt: null },
      })
    }

    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

// ── Skill levels ──────────────────────────────────────────────────────────────

export async function upsertSkillLevel(
  skillId: string,
  level: ProficiencyLevel,
  patch: { label?: string | null; description?: string | null },
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }

    await prisma.skillLevel.upsert({
      where: { skillId_level: { skillId, level } },
      update: patch,
      create: { skillId, level, label: patch.label ?? null, description: patch.description ?? null },
    })

    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

// ── Skill standards ───────────────────────────────────────────────────────────

export async function upsertStandard(
  skillId:       string,
  jobLevel:      string,
  requiredLevel: ProficiencyLevel | null,
): Promise<{ error?: string }> {
  try {
    const { error } = await requireHrOrError()
    if (error) return { error }

    if (requiredLevel === null) {
      await prisma.skillStandard.deleteMany({
        where: { skillId, jobLevel },
      })
    } else {
      await prisma.skillStandard.upsert({
        where: { skillId_jobLevel: { skillId, jobLevel } },
        update: { requiredLevel },
        create: { skillId, jobLevel, requiredLevel },
      })
    }

    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}
