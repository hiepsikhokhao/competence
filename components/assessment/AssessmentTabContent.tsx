import { createServerSupabaseClient } from '@/lib/supabase'
import AssessmentForm from './AssessmentForm'
import GapTable from '@/components/gap/GapTable'
import type { GapRow } from '@/components/gap/GapTable'
import type { FunctionType, ProficiencyLevel } from '@/lib/types'

type Props = {
  userId:       string
  userFunction: FunctionType | null
  userJobLevel: string | null
}

export default async function AssessmentTabContent({ userId, userFunction, userJobLevel }: Props) {
  const supabase = await createServerSupabaseClient()

  // ── Active cycle ─────────────────────────────────────────────────────────────
  const { data: cycles } = await supabase
    .from('cycle')
    .select('id, name, status')
    .eq('status', 'open')
    .limit(1)

  const cycle = cycles?.[0] ?? null

  // ── Skills for this user's function ──────────────────────────────────────────
  let skills: { id: string; name: string; definition: string | null }[] = []
  let skillLevelsMap: Record<
    string,
    { level: number; label: string | null; description: string | null }[]
  > = {}
  let standardsMap: Record<string, ProficiencyLevel> = {}

  if (userFunction) {
    const { data: skillsData } = await supabase
      .from('skills')
      .select('id, name, definition')
      .eq('function', userFunction)
      .order('name')

    skills = skillsData ?? []

    if (skills.length > 0) {
      const skillIds = skills.map((s) => s.id)

      const { data: levelsData } = await supabase
        .from('skill_levels')
        .select('skill_id, level, label, description')
        .in('skill_id', skillIds)
        .order('level')

      for (const l of levelsData ?? []) {
        skillLevelsMap[l.skill_id] ??= []
        skillLevelsMap[l.skill_id].push(l)
      }

      if (userJobLevel) {
        const { data: standardsData } = await supabase
          .from('skill_standards')
          .select('skill_id, required_level')
          .in('skill_id', skillIds)
          .eq('job_level', userJobLevel)

        for (const s of standardsData ?? []) {
          standardsMap[s.skill_id] = s.required_level as ProficiencyLevel
        }
      }
    }
  }

  // ── Assessment (get or create) ────────────────────────────────────────────────
  let { data: assessment } = await supabase
    .from('assessments')
    .select('id, self_status, manager_status')
    .eq('employee_id', userId)
    .maybeSingle()

  if (!assessment && cycle) {
    const { data: created } = await supabase
      .from('assessments')
      .insert({ cycle_id: cycle.id, employee_id: userId })
      .select('id, self_status, manager_status')
      .single()
    assessment = created
  }

  // ── Existing scores ───────────────────────────────────────────────────────────
  let scoresData: { skill_id: string; self_score: number | null; final_score: number | null }[] = []

  if (assessment) {
    const { data } = await supabase
      .from('assessment_scores')
      .select('skill_id, self_score, final_score')
      .eq('assessment_id', assessment.id)
    scoresData = data ?? []
  }

  const initialScores: Record<string, ProficiencyLevel> = {}
  for (const s of scoresData) {
    if (s.self_score != null) {
      initialScores[s.skill_id] = s.self_score as ProficiencyLevel
    }
  }

  const gapRows: GapRow[] = skills.map((s) => {
    const score = scoresData.find((sc) => sc.skill_id === s.id)
    return {
      skill_id:       s.id,
      skill_name:     s.name,
      self_score:     (score?.self_score  ?? null) as ProficiencyLevel | null,
      final_score:    (score?.final_score ?? null) as ProficiencyLevel | null,
      required_level: standardsMap[s.id] ?? null,
    }
  })

  const skillsForForm = skills.map((s) => ({
    id:         s.id,
    name:       s.name,
    definition: s.definition,
    levels:     skillLevelsMap[s.id] ?? [],
  }))

  const isSubmitted       = assessment?.self_status   === 'submitted'
  const isManagerReviewed = assessment?.manager_status === 'reviewed'

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!userFunction) {
    return (
      <Notice
        type="warning"
        message="Your function is not set. Contact HR to complete your profile."
      />
    )
  }

  if (!cycle) {
    return (
      <Notice
        type="info"
        message="The assessment cycle is not currently open. Check back later."
      />
    )
  }

  if (skills.length === 0) {
    return (
      <Notice
        type="info"
        message={`No skills are assigned to the ${userFunction} function yet.`}
      />
    )
  }

  if (!assessment) {
    return (
      <Notice
        type="error"
        message="Could not create your assessment record. Please refresh the page."
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* State 1: not yet submitted → show form */}
      {!isSubmitted && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{cycle.name}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Rate your proficiency for each skill in your function.
                Changes are saved automatically.
              </p>
            </div>
            <StatusPill status={assessment.self_status} />
          </div>
          <AssessmentForm
            assessmentId={assessment.id}
            skills={skillsForForm}
            initialScores={initialScores}
          />
        </>
      )}

      {/* State 2: submitted, awaiting manager */}
      {isSubmitted && !isManagerReviewed && (
        <div className="py-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 mb-4">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Submitted
          </div>
          <p className="text-base font-semibold text-gray-900">Awaiting line manager review</p>
          <p className="mt-1 text-sm text-gray-500">
            Your self-assessment has been submitted. You'll be able to see your results once
            your manager completes their review.
          </p>
        </div>
      )}

      {/* State 3: manager reviewed → show gap results */}
      {isSubmitted && isManagerReviewed && (
        <>
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <span className="size-1.5 rounded-full bg-green-500" />
              Review complete
            </span>
            {!userJobLevel && (
              <span className="text-xs text-amber-600">
                Job level not set — gap calculations require it. Contact HR.
              </span>
            )}
          </div>
          <GapTable rows={gapRows} />
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Notice({ type, message }: { type: 'info' | 'warning' | 'error'; message: string }) {
  const styles = {
    info:    'border-blue-200 bg-blue-50 text-blue-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error:   'border-red-200 bg-red-50 text-red-800',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {message}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_started: { label: 'Not started', cls: 'bg-gray-100 text-gray-600' },
    draft:       { label: 'Draft',       cls: 'bg-amber-50 text-amber-700' },
    submitted:   { label: 'Submitted',   cls: 'bg-green-50 text-green-700' },
  }
  const { label, cls } = map[status] ?? map.not_started
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
