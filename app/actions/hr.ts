'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { FunctionType, ProficiencyLevel, Skill, UserRole } from '@/lib/types'

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireHr() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr') throw new Error('Not authorized')
  return supabase
}

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
    const supabase = await requireHr()
    const { error } = await supabase.from('cycle').insert({ name })
    if (error) return { error: error.message }
    revalidatePath('/hr')
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function openCycle(
  cycleId: string,
): Promise<{ error?: string }> {
  try {
    const supabase = await requireHr()
    const { error } = await supabase
      .from('cycle')
      .update({ status: 'open', opened_at: new Date().toISOString() })
      .eq('id', cycleId)
    if (error) return { error: error.message }
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function closeCycle(
  cycleId: string,
): Promise<{ error?: string }> {
  try {
    const supabase = await requireHr()
    const { error } = await supabase
      .from('cycle')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', cycleId)
    if (error) return { error: error.message }
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
    const supabase = await requireHr()
    const { error } = await supabase
      .from('users')
      .update({ manager_id: managerId })
      .eq('id', userId)
    if (error) return { error: error.message }
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
  const supabase = await requireHr()

  const { data: existing } = await supabase.from('users').select('id, email')
  const emailToId = Object.fromEntries(
    (existing ?? []).map((u) => [u.email.toLowerCase(), u.id])
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
    if (row.name?.trim())                                      patch.name      = row.name.trim()
    if (row.dept?.trim())                                      patch.dept      = row.dept.trim()
    if (row.job_level?.trim())                                 patch.job_level = row.job_level.trim()
    if (row.role     && VALID_ROLES.includes(row.role as UserRole))         patch.role     = row.role
    if (row.function && VALID_FUNCS.includes(row.function as FunctionType)) patch.function = row.function

    if (row.manager_email?.trim()) {
      const managerId = emailToId[row.manager_email.trim().toLowerCase()]
      patch.manager_id = managerId ?? null
      if (!managerId) errors.push(`Manager not found for ${row.email}: ${row.manager_email}`)
    }

    if (Object.keys(patch).length === 0) { skipped++; continue }

    const { error } = await supabase.from('users').update(patch).eq('id', userId)
    if (error) { errors.push(`${row.email}: ${error.message}`) }
    else       { updated++ }
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
    const supabase = await requireHr()
    const { data, error } = await supabase
      .from('skills')
      .insert(input)
      .select()
      .single()
    if (error) return { error: error.message }
    revalidateAll()
    return { skill: data as Skill }
  } catch (e) { return { error: (e as Error).message } }
}

export async function updateSkill(
  id:    string,
  patch: { name: string; definition: string | null },
): Promise<{ error?: string }> {
  try {
    const supabase = await requireHr()
    const { error } = await supabase.from('skills').update(patch).eq('id', id)
    if (error) return { error: error.message }
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

export async function deleteSkill(
  id: string,
): Promise<{ error?: string }> {
  try {
    const supabase = await requireHr()
    const { error } = await supabase.from('skills').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}

// ── Skill standards ───────────────────────────────────────────────────────────

export async function upsertStandard(
  skillId:       string,
  jobLevel:      string,
  requiredLevel: ProficiencyLevel | null,   // null = delete
): Promise<{ error?: string }> {
  try {
    const supabase = await requireHr()

    if (requiredLevel === null) {
      const { error } = await supabase
        .from('skill_standards')
        .delete()
        .eq('skill_id', skillId)
        .eq('job_level', jobLevel)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('skill_standards')
        .upsert(
          { skill_id: skillId, job_level: jobLevel, required_level: requiredLevel },
          { onConflict: 'skill_id,job_level' },
        )
      if (error) return { error: error.message }
    }

    revalidateAll()
    return {}
  } catch (e) { return { error: (e as Error).message } }
}
