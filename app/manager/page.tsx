import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { logout } from '@/app/actions/auth'
import AssessmentTabContent from '@/components/assessment/AssessmentTabContent'
import LanguageToggle from '@/components/LanguageToggle'
import { LangProvider } from '@/lib/lang-context'
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
  const authUser = await requireAuth()

  const profile = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { name: true, role: true, function: true, jobLevel: true },
  })

  if (profile?.role !== 'manager') redirect('/login')

  const params     = await searchParams
  const tab        = params.tab      ?? 'assessment'
  const employeeId = params.employee ?? null

  const userFunction = profile.function as FunctionType | null
  const userJobLevel = profile.jobLevel

  // ── My Team tab data ─────────────────────────────────────────────────────────
  let teamMembers: TeamMember[] = []

  if (tab === 'team') {
    const members = await prisma.user.findMany({
      where: { managerId: authUser.id },
      orderBy: { name: 'asc' },
    })

    if (members.length > 0) {
      const memberIds = members.map((m) => m.id)

      const assessments = await prisma.assessment.findMany({
        where: { employeeId: { in: memberIds } },
        select: { employeeId: true, selfStatus: true, managerStatus: true },
      })

      const assessmentMap = Object.fromEntries(
        assessments.map((a) => [a.employeeId, a]),
      )

      teamMembers = members.map((m) => ({
        id:         m.id,
        name:       m.name,
        email:      m.email,
        username:   m.username,
        role:       m.role,
        dept:       m.dept,
        function:   m.function,
        job_level:  m.jobLevel,
        manager_id: m.managerId,
        created_at: m.createdAt.toISOString(),
        assessment: assessmentMap[m.id]
          ? { self_status: assessmentMap[m.id].selfStatus, manager_status: assessmentMap[m.id].managerStatus }
          : null,
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

    const assessment = await prisma.assessment.findFirst({
      where: { employeeId },
      select: { id: true, managerStatus: true },
    })

    if (!assessment) redirect('/manager?tab=team')

    const employeeFunction = member.function as FunctionType | null
    let reviewRows: ReviewRow[] = []

    if (employeeFunction) {
      const skills = await prisma.skill.findMany({
        where: { function: employeeFunction },
        orderBy: { name: 'asc' },
      })

      if (skills.length > 0) {
        const skillIds = skills.map((s) => s.id)

        const [scoresData, standardsData, levelsData] = await Promise.all([
          prisma.assessmentScore.findMany({
            where: { assessmentId: assessment.id },
            select: { skillId: true, selfScore: true, managerScore: true, evidence: true },
          }),
          member.job_level
            ? prisma.skillStandard.findMany({
                where: { skillId: { in: skillIds }, jobLevel: member.job_level },
                select: { skillId: true, requiredLevel: true },
              })
            : Promise.resolve([]),
          prisma.skillLevel.findMany({
            where: { skillId: { in: skillIds } },
            orderBy: { level: 'asc' },
            select: { skillId: true, level: true, label: true, description: true, descriptionEn: true, descriptionVi: true },
          }),
        ])

        const scoresMap    = Object.fromEntries(scoresData.map((s) => [s.skillId, s]))
        const standardsMap = Object.fromEntries(
          standardsData.map((s) => [s.skillId, s.requiredLevel as ProficiencyLevel]),
        )

        const levelsMap: Record<string, { level: number; label: string | null; description: string | null; description_en: string | null; description_vi: string | null }[]> = {}
        for (const l of levelsData) {
          levelsMap[l.skillId] ??= []
          levelsMap[l.skillId].push({
            level: l.level,
            label: l.label,
            description: l.description,
            description_en: l.descriptionEn,
            description_vi: l.descriptionVi,
          })
        }

        reviewRows = skills.map((s) => ({
          skill_id:       s.id,
          skill_name:     s.name,
          definition:     s.definition,
          definition_en:  s.definitionEn ?? null,
          definition_vi:  s.definitionVi ?? null,
          levels:         levelsMap[s.id] ?? [],
          self_score:     (scoresMap[s.id]?.selfScore    ?? null) as ProficiencyLevel | null,
          manager_score:  (scoresMap[s.id]?.managerScore ?? null) as ProficiencyLevel | null,
          evidence:       (scoresMap[s.id]?.evidence      ?? null) as string | null,
          required_level: standardsMap[s.id] ?? null,
          importance:     s.importance ?? null,
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
          {assessment.managerStatus === 'reviewed' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <span className="size-1.5 rounded-full bg-green-500" />
              Review submitted
            </span>
          )}
        </div>
        <ReviewForm
          assessmentId={assessment.id}
          rows={reviewRows}
          isReviewed={assessment.managerStatus === 'reviewed'}
        />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F4F6FB]">
      <LangProvider>
      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#003087]">Manager Dashboard</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#6B7280]">
              <span>{profile.name}</span>
              {userFunction && (
                <>
                  <span aria-hidden>·</span>
                  <span>{userFunction}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <TabBar
          tabs={[
            { id: 'assessment', label: 'My Assessment', href: '/manager?tab=assessment' },
            { id: 'result',     label: 'My Result',     href: '/manager?tab=result'     },
            { id: 'team',       label: 'My Team',       href: '/manager?tab=team'       },
          ]}
          currentTab={tab}
        />

        {/* My Assessment tab */}
        {tab === 'assessment' && (
          <AssessmentTabContent
            userId={authUser.id}
            userFunction={userFunction}
            userJobLevel={userJobLevel}
            baseUrl="/manager"
            activeTab="assessment"
            showTabBar={false}
          />
        )}

        {/* My Result tab */}
        {tab === 'result' && (
          <AssessmentTabContent
            userId={authUser.id}
            userFunction={userFunction}
            userJobLevel={userJobLevel}
            baseUrl="/manager"
            activeTab="result"
            showTabBar={false}
          />
        )}

        {/* My Team tab */}
        {tab === 'team' && !employeeId && (
          <div className="space-y-6">
            {/* Instruction block */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-sm font-semibold text-gray-800">
                Game Publishing Functional Competency — Line Manager Assessment
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>Review each competency and assess based on the employee's performance in recent months (typically 3–6 months).</p>
                <p>The displayed ratings reflect the employee's self-assessment for your reference.</p>
                <p>Rate based on consistent performance; if between two levels, select the lower level.</p>
              </div>
            </div>
            <TeamTable members={teamMembers} />
          </div>
        )}

        {tab === 'team' && employeeId && reviewContent}
      </div>
      </LangProvider>
    </main>
  )
}
