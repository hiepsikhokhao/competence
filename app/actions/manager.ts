'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ProficiencyLevel } from '@/lib/types'

// ── Save a single manager score (auto-save) ───────────────────────────────────

export async function saveManagerScore(
  assessmentId: string,
  skillId: string,
  managerScore: ProficiencyLevel,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify assessment exists and belongs to a direct report
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, manager_status, employee_id')
    .eq('id', assessmentId)
    .single()

  if (!assessment) return { error: 'Assessment not found' }
  if (assessment.manager_status === 'reviewed') return { error: 'Review already submitted' }

  const { data: employee } = await supabase
    .from('users')
    .select('id')
    .eq('id', assessment.employee_id)
    .eq('manager_id', user.id)
    .single()

  if (!employee) return { error: 'Not authorized to review this assessment' }

  const { error: upsertError } = await supabase
    .from('assessment_scores')
    .upsert(
      { assessment_id: assessmentId, skill_id: skillId, manager_score: managerScore },
      { onConflict: 'assessment_id,skill_id' },
    )

  if (upsertError) return { error: upsertError.message }

  return {}
}

// ── Submit manager review (lock, finalize scores) ─────────────────────────────

export async function submitManagerReview(
  assessmentId: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, employee_id')
    .eq('id', assessmentId)
    .single()

  if (!assessment) return { error: 'Assessment not found' }

  const { data: employee } = await supabase
    .from('users')
    .select('id')
    .eq('id', assessment.employee_id)
    .eq('manager_id', user.id)
    .single()

  if (!employee) return { error: 'Not authorized to review this assessment' }

  const { error } = await supabase
    .from('assessments')
    .update({
      manager_status: 'reviewed',
      manager_reviewed_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)
    .eq('manager_status', 'pending')   // guard against double-submit

  if (error) return { error: error.message }

  revalidatePath('/manager')
  return {}
}
