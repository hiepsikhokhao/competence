'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ProficiencyLevel } from '@/lib/types'

// ── Save a single skill score (auto-save draft) ───────────────────────────────

export async function saveScore(
  assessmentId: string,
  skillId: string,
  selfScore: ProficiencyLevel,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify this assessment belongs to the calling user before writing
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, self_status, employee_id')
    .eq('id', assessmentId)
    .eq('employee_id', user.id)
    .single()

  if (!assessment) return { error: 'Assessment not found' }
  if (assessment.self_status === 'submitted') return { error: 'Assessment already submitted' }

  const { error: upsertError } = await supabase
    .from('assessment_scores')
    .upsert(
      { assessment_id: assessmentId, skill_id: skillId, self_score: selfScore },
      { onConflict: 'assessment_id,skill_id' },
    )

  if (upsertError) return { error: upsertError.message }

  // Advance status to 'draft' the first time a score is saved
  if (assessment.self_status === 'not_started') {
    await supabase
      .from('assessments')
      .update({ self_status: 'draft' })
      .eq('id', assessmentId)
  }

  return {}
}

// ── Submit assessment (lock form, trigger results view) ───────────────────────

export async function submitAssessment(
  assessmentId: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('assessments')
    .update({
      self_status: 'submitted',
      self_submitted_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)
    .eq('employee_id', user.id)        // ownership check
    .in('self_status', ['not_started', 'draft'])  // guard against double-submit

  if (error) return { error: error.message }

  // Revalidate causes Next.js to return the updated RSC payload in the same
  // roundtrip, seamlessly swapping AssessmentForm → GapTable on the client.
  revalidatePath('/employee')
  revalidatePath('/manager')
  return {}
}
