import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logout } from '@/app/actions/auth'
import AssessmentTabContent from '@/components/assessment/AssessmentTabContent'
import TabBar from '@/components/manager/TabBar'
import TeamTable from '@/components/manager/TeamTable'
import ReviewForm from '@/components/manager/ReviewForm'
import type { ReviewRow } from '@/components/manager/ReviewForm'
import type { FunctionType, ProficiencyLevel, TeamMember } from '@/lib/types'

export const metadata = { title: 'Manager Dashboard — Competency Tool' }

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; employee?: string }>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role, function, job_level')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') redirect('/login')

  const params     = await searchParams
  const tab        = params.tab      ?? 'assessment'
  const employeeId = params.employee ?? null

  const userFunction = profile.function as FunctionType | null
  const userJobLevel = profile.job_level

  // ── My Team tab data ─────────────────────────────────────────────────────────
  let teamMembers: TeamMember[] = []

  if (tab === 'team') {
    const { data: membersData } = await supabase
      .from('users')
      .select('id, name, email, role, dept, function, job_level, manager_id, created_at')
      .eq('manager_id', user.id)
      .order('name')

    const members = membersData ?? []

    if (members.length > 0) {
      const memberIds = members.map((m) => m.id)

      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('employee_id, self_status, manager_status')
        .in('employee_id', memberIds)

      const assessmentMap = Object.fromEntries(
        (assessmentsData ?? []).map((a) => [a.employee_id, a])
      )

      teamMembers = members.map((m) => ({
        ...m,
        assessment: assessmentMap[m.id] ?? null,
      }))
    }
  }

  // ── Individual review (tab=team&employee=<id>) ────────────────────────────────
  let reviewContent: React.ReactNode = null

  if (tab === 'team' && employeeId) {
    const member = teamMembers.find((m) => m.id === employeeId)

    if (!member || member.assessment?.self_status !== 'submitted') {
      redirect('/manager?tab=team')
    }

    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, manager_status')
      .eq('employee_id', employeeId)
      .single()

    if (!assessment) redirect('/manager?tab=team')

    const employeeFunction = member.function as FunctionType | null
    let reviewRows: ReviewRow[] = []

    if (employeeFunction) {
      const { data: skillsData } = await supabase
        .from('skills')
        .select('id, name')
        .eq('function', employeeFunction)
        .order('name')

      const skills = skillsData ?? []

      if (skills.length > 0) {
        const skillIds = skills.map((s) => s.id)

        const [scoresResult, standardsResult] = await Promise.all([
          supabase
            .from('assessment_scores')
            .select('skill_id, self_score, manager_score')
            .eq('assessment_id', assessment.id),
          member.job_level
            ? supabase
                .from('skill_standards')
                .select('skill_id, required_level')
                .in('skill_id', skillIds)
                .eq('job_level', member.job_level)
            : Promise.resolve({ data: [] as { skill_id: string; required_level: number }[] | null }),
        ])

        const scoresMap    = Object.fromEntries((scoresResult.data ?? []).map((s) => [s.skill_id, s]))
        const standardsMap = Object.fromEntries(
          (standardsResult.data ?? []).map((s) => [s.skill_id, s.required_level as ProficiencyLevel])
        )

        reviewRows = skills.map((s) => ({
          skill_id:       s.id,
          skill_name:     s.name,
          self_score:     (scoresMap[s.id]?.self_score    ?? null) as ProficiencyLevel | null,
          manager_score:  (scoresMap[s.id]?.manager_score ?? null) as ProficiencyLevel | null,
          required_level: standardsMap[s.id] ?? null,
        }))
      }
    }

    reviewContent = (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/manager?tab=team"
              className="mb-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              ← Back to team
            </Link>
            <h2 className="text-base font-semibold text-gray-900">{member.name}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {employeeFunction ?? '—'} · Level {member.job_level ?? '—'}
            </p>
          </div>
          {assessment.manager_status === 'reviewed' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <span className="size-1.5 rounded-full bg-green-500" />
              Review submitted
            </span>
          )}
        </div>
        <ReviewForm
          assessmentId={assessment.id}
          rows={reviewRows}
          isReviewed={assessment.manager_status === 'reviewed'}
        />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <span>{profile.name}</span>
              {userFunction && (
                <>
                  <span aria-hidden>·</span>
                  <span>{userFunction}</span>
                </>
              )}
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>

        <TabBar
          tabs={[
            { id: 'assessment', label: 'My Assessment', href: '/manager?tab=assessment' },
            { id: 'team',       label: 'My Team',       href: '/manager?tab=team'       },
          ]}
          currentTab={tab}
        />

        {tab === 'assessment' && (
          <AssessmentTabContent
            userId={user.id}
            userFunction={userFunction}
            userJobLevel={userJobLevel}
          />
        )}

        {tab === 'team' && (
          employeeId ? reviewContent : <TeamTable members={teamMembers} />
        )}
      </div>
    </main>
  )
}
