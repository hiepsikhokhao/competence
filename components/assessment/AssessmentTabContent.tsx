import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import AssessmentForm from './AssessmentForm'
import GapTable from '@/components/gap/GapTable'
import type { GapRow } from '@/components/gap/GapTable'
import type { FunctionType, ProficiencyLevel } from '@/lib/types'

type Props = {
  userId:       string
  userFunction: FunctionType | null
  userJobLevel: string | null
  baseUrl:      string
  activeTab:    'assessment' | 'result'
  showTabBar?:  boolean
}

export default async function AssessmentTabContent({
  userId,
  userFunction,
  userJobLevel,
  baseUrl,
  activeTab,
  showTabBar = true,
}: Props) {
  // ── Active cycle ─────────────────────────────────────────────────────────────
  const cycles = await prisma.cycle.findMany({ select: { id: true, name: true }, take: 1 })
  const cycle = cycles[0] ?? null

  // ── Skills for this user's function ──────────────────────────────────────────
  let skills: { id: string; name: string; definition: string | null; definition_en: string | null; definition_vi: string | null; importance: number | null }[] = []
  let skillLevelsMap: Record<
    string,
    { level: number; label: string | null; description: string | null; description_en: string | null; description_vi: string | null }[]
  > = {}
  let standardsMap: Record<string, ProficiencyLevel> = {}

  if (userFunction) {
    const skillsData = await prisma.skill.findMany({
      where: { function: userFunction },
      orderBy: { name: 'asc' },
    })

    skills = skillsData.map((s) => ({
      id: s.id,
      name: s.name,
      definition: s.definition,
      definition_en: s.definitionEn,
      definition_vi: s.definitionVi,
      importance: s.importance,
    }))

    if (skills.length > 0) {
      const skillIds = skills.map((s) => s.id)

      const levelsData = await prisma.skillLevel.findMany({
        where: { skillId: { in: skillIds } },
        orderBy: { level: 'asc' },
      })

      for (const l of levelsData) {
        skillLevelsMap[l.skillId] ??= []
        skillLevelsMap[l.skillId].push({
          level: l.level,
          label: l.label,
          description: l.description,
          description_en: l.descriptionEn,
          description_vi: l.descriptionVi,
        })
      }

      if (userJobLevel) {
        const standardsData = await prisma.skillStandard.findMany({
          where: { skillId: { in: skillIds }, jobLevel: userJobLevel },
        })
        for (const s of standardsData) {
          standardsMap[s.skillId] = s.requiredLevel as ProficiencyLevel
        }
      }
    }
  }

  // ── Assessment (get or create) ────────────────────────────────────────────────
  let assessment = cycle
    ? await prisma.assessment.findFirst({
        where: { employeeId: userId, cycleId: cycle.id },
        select: { id: true, selfStatus: true, managerStatus: true },
      })
    : await prisma.assessment.findFirst({
        where: { employeeId: userId },
        select: { id: true, selfStatus: true, managerStatus: true },
      })

  if (!assessment && cycle) {
    assessment = await prisma.assessment.create({
      data: { cycleId: cycle.id, employeeId: userId },
      select: { id: true, selfStatus: true, managerStatus: true },
    })
  }

  // ── Existing scores + evidence ────────────────────────────────────────────────
  let scoresData: {
    skill_id: string
    self_score: number | null
    manager_score: number | null
    final_score: number | null
    evidence: string | null
  }[] = []

  if (assessment) {
    const raw = await prisma.assessmentScore.findMany({
      where: { assessmentId: assessment.id },
      select: { skillId: true, selfScore: true, managerScore: true, finalScore: true, evidence: true },
    })
    scoresData = raw.map((s) => ({
      skill_id: s.skillId,
      self_score: s.selfScore,
      manager_score: s.managerScore,
      final_score: s.finalScore,
      evidence: s.evidence,
    }))
  }

  const initialScores: Record<string, ProficiencyLevel> = {}
  const initialEvidence: Record<string, string> = {}
  for (const s of scoresData) {
    if (s.self_score != null) initialScores[s.skill_id] = s.self_score as ProficiencyLevel
    if (s.evidence) initialEvidence[s.skill_id] = s.evidence
  }

  const gapRows: GapRow[] = skills.map((s) => {
    const score = scoresData.find((sc) => sc.skill_id === s.id)
    return {
      skill_id:       s.id,
      skill_name:     s.name,
      self_score:     (score?.self_score    ?? null) as ProficiencyLevel | null,
      manager_score:  (score?.manager_score ?? null) as ProficiencyLevel | null,
      final_score:    (score?.final_score   ?? null) as ProficiencyLevel | null,
      required_level: standardsMap[s.id] ?? null,
      importance:     s.importance ?? null,
    }
  })

  const skillsForForm = skills.map((s) => ({
    id:            s.id,
    name:          s.name,
    definition:    s.definition,
    definition_en: s.definition_en,
    definition_vi: s.definition_vi,
    levels:        skillLevelsMap[s.id] ?? [],
  }))

  const isSubmitted       = assessment?.selfStatus    === 'submitted'
  const isManagerReviewed = assessment?.managerStatus === 'reviewed'

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!userFunction) {
    return (
      <Notice
        type="warning"
        message="Your function is not set. Contact HR to complete your profile."
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

  // ── Tab bar ───────────────────────────────────────────────────────────────────
  const tabBar = showTabBar ? (
    <div className="mb-6 flex gap-1 border-b border-gray-200">
      <TabLink
        href={`${baseUrl}?tab=assessment`}
        active={activeTab === 'assessment'}
        label="My Assessment"
      />
      <TabLink
        href={`${baseUrl}?tab=result`}
        active={activeTab === 'result'}
        label="My Result"
      />
    </div>
  ) : null

  // ── My Assessment tab ─────────────────────────────────────────────────────────
  if (activeTab === 'assessment') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {tabBar}

        {/* Title + status */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Game Publishing Functional Competency — Self-Assessment
            </h2>
            {cycle?.name && <p className="mt-0.5 text-xs text-gray-500">{cycle.name}</p>}
          </div>
          <StatusPill status={assessment.selfStatus} />
        </div>

        {/* Instruction block — always visible */}
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800 space-y-1">
          <p>Read each competency and its proficiency levels, select the level that best reflects your performance in recent months (typically 3–6 months).</p>
          <p>Rate based on your consistent performance (not occasional or best-case situations).</p>
          <p>If your capability falls between two levels, select the lower level.</p>
        </div>

        {isSubmitted && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Your self-assessment has been submitted and is now read-only. View your current results in the My Result tab.
          </div>
        )}

        <AssessmentForm
          assessmentId={assessment.id}
          skills={skillsForForm}
          initialScores={initialScores}
          initialEvidence={initialEvidence}
          standards={standardsMap}
          readOnly={isSubmitted}
        />
      </div>
    )
  }

  // ── My Result tab ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {tabBar}

      {!isSubmitted ? (
        <div className="py-10 text-center">
          <p className="text-base font-semibold text-gray-900">Submit your assessment first</p>
          <p className="mt-1 text-sm text-gray-500">
            Results will appear here once you submit your self-assessment.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              Game Publishing Functional Competency — My Result
            </h2>
            {isManagerReviewed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <span className="size-1.5 rounded-full bg-green-500" />
                Review complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Awaiting manager review
              </span>
            )}
          </div>

          {!isManagerReviewed && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Awaiting line manager review. Results below are based on your self-assessment.
            </div>
          )}

          {!userJobLevel && (
            <p className="mb-4 text-xs text-amber-600">
              Job level not set — gap calculations require it. Contact HR.
            </p>
          )}

          <GapTable rows={gapRows} managerReviewed={isManagerReviewed} />

          {!isManagerReviewed && (
            <p className="mt-2 text-xs italic text-gray-400">
              * Scores may be adjusted after manager review
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={[
        'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-[#0057D9] text-[#0057D9]'
          : 'border-transparent text-gray-500 hover:text-gray-700',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

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
