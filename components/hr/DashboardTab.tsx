import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { JOB_LEVELS } from '@/lib/utils'
import type { FunctionType, ProficiencyLevel } from '@/lib/types'

const FUNCTIONS: FunctionType[] = ['UA', 'MKT', 'LiveOps']

function heatCell(avg: number): string {
  if (avg >  1)    return 'bg-green-300 text-green-900'
  if (avg >  0)    return 'bg-green-100 text-green-800'
  if (avg >= -0.2) return 'bg-gray-100  text-gray-600'
  if (avg >  -1)   return 'bg-amber-100 text-amber-800'
  return 'bg-red-200 text-red-900'
}

type Props = { drillFn: FunctionType | null }

export default async function DashboardTab({ drillFn }: Props) {
  const [users, asmts, scores, skillsRaw, standards] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, name: true, function: true, jobLevel: true },
    }),
    prisma.assessment.findMany({
      select: { id: true, employeeId: true, selfStatus: true, managerStatus: true },
    }),
    prisma.assessmentScore.findMany({
      select: { assessmentId: true, skillId: true, finalScore: true },
    }),
    prisma.skill.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, function: true, importance: true },
    }),
    prisma.skillStandard.findMany({
      select: { skillId: true, jobLevel: true, requiredLevel: true },
    }),
  ])

  const skills = skillsRaw as { id: string; name: string; function: FunctionType; importance: number | null }[]

  const assmtByEmployee = Object.fromEntries(asmts.map((a) => [a.employeeId, a]))
  const assmtById       = Object.fromEntries(asmts.map((a) => [a.id, a]))
  const userById        = Object.fromEntries(users.map((u) => [u.id, u]))
  const stdMap          = Object.fromEntries(
    standards.map((s) => [`${s.skillId}:${s.jobLevel}`, s.requiredLevel as ProficiencyLevel]),
  )

  // ── Completion stats per function ─────────────────────────────────────────
  const completion = FUNCTIONS.map((fn) => {
    const fnUsers   = users.filter((u) => u.function === fn)
    const submitted = fnUsers.filter((u) => assmtByEmployee[u.id]?.selfStatus    === 'submitted').length
    const reviewed  = fnUsers.filter((u) => assmtByEmployee[u.id]?.managerStatus === 'reviewed').length
    return { fn, total: fnUsers.length, submitted, reviewed }
  })

  // ── Gap heatmap ────────────────────────────────────────────────────────────
  type Cell = { sum: number; count: number }
  const heatmap: Record<FunctionType, Record<string, Record<string, Cell>>> = {
    UA: {}, MKT: {}, LiveOps: {},
  }

  for (const sc of scores) {
    if (sc.finalScore == null) continue
    const asmt = assmtById[sc.assessmentId]
    if (!asmt || asmt.selfStatus !== 'submitted') continue
    const u = userById[asmt.employeeId]
    if (!u?.function || !u?.jobLevel) continue

    const fn    = u.function as FunctionType
    const skill = skills.find((s) => s.id === sc.skillId)
    if (!skill || skill.function !== fn) continue

    const required = stdMap[`${sc.skillId}:${u.jobLevel}`]
    if (required == null) continue

    const importance = skill.importance ?? null
    const gap = importance != null
      ? (sc.finalScore * importance) - (required * importance)
      : sc.finalScore - required
    heatmap[fn][sc.skillId]              ??= {}
    heatmap[fn][sc.skillId][u.jobLevel]  ??= { sum: 0, count: 0 }
    heatmap[fn][sc.skillId][u.jobLevel].sum   += gap
    heatmap[fn][sc.skillId][u.jobLevel].count += 1
  }

  const activeJobLevels = [...JOB_LEVELS].filter((jl) =>
    users.some((u) => u.jobLevel === jl),
  )

  const anySubmitted = asmts.some((a) => a.selfStatus === 'submitted')

  // ── Drill-down view ──────────────────────────────────────────────────────
  if (drillFn) {
    const fnUsers   = users.filter((u) => u.function === drillFn)
    const fnSkills  = skills.filter((s) => s.function === drillFn)

    const userRows = fnUsers.map((u) => {
      const asmt = assmtByEmployee[u.id]
      const skillGaps = fnSkills.map((s) => {
        const asmtScore = asmt
          ? scores.find((sc) => sc.assessmentId === asmt.id && sc.skillId === s.id)
          : null
        const required = u.jobLevel ? stdMap[`${s.id}:${u.jobLevel}`] ?? null : null
        const gap = asmtScore?.finalScore != null && required != null
          ? asmtScore.finalScore - required
          : null
        return { skillId: s.id, skillName: s.name, gap }
      })
      return { user: u, asmt, skillGaps }
    })

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/hr?tab=dashboard"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← Back to dashboard
          </Link>
          <h2 className="text-base font-semibold text-gray-900">{drillFn} — Employee Details</h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Level</th>
                  <th className="px-4 py-3 whitespace-nowrap">Self Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Review</th>
                  {fnSkills.map((s) => (
                    <th key={s.id} className="px-4 py-3 whitespace-nowrap text-center">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userRows.map(({ user: u, asmt, skillGaps }) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.jobLevel ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={asmt?.selfStatus ?? 'not_started'} type="self" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={asmt?.managerStatus ?? 'pending'} type="manager" />
                    </td>
                    {skillGaps.map(({ skillId, gap }) => (
                      <td key={skillId} className="px-4 py-3 text-center">
                        {gap == null ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <GapChip gap={gap} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {fnUsers.length === 0 && (
                  <tr>
                    <td colSpan={4 + fnSkills.length} className="px-4 py-8 text-center text-sm text-gray-400">
                      No employees in {drillFn}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Completion cards */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Completion — click a function to drill down
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {completion.map(({ fn, total, submitted, reviewed }) => {
            const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
            return (
              <Link
                key={fn}
                href={`/hr?tab=dashboard&fn=${fn}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[#0057D9] hover:shadow-md transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{fn}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{pct}%</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {submitted}/{total} submitted · {reviewed} reviewed
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#0057D9] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Gap heatmaps */}
      {anySubmitted ? (
        FUNCTIONS.map((fn) => {
          const fnSkills = skills.filter((s) => s.function === fn)
          if (fnSkills.length === 0) return null

          return (
            <div key={fn}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Gap Heatmap — {fn}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="min-w-[180px] px-4 py-2.5 text-left font-semibold text-gray-600">
                        Skill
                      </th>
                      {activeJobLevels.map((jl) => (
                        <th key={jl} className="min-w-[64px] px-3 py-2.5 text-center font-semibold text-gray-600">
                          {jl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fnSkills.map((skill) => (
                      <tr key={skill.id}>
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-700">
                          {skill.name}
                        </td>
                        {activeJobLevels.map((jl) => {
                          const cell = heatmap[fn][skill.id]?.[jl]
                          if (!cell || cell.count === 0) {
                            return (
                              <td key={jl} className="px-3 py-2.5 text-center text-gray-300">—</td>
                            )
                          }
                          const avg  = cell.sum / cell.count
                          const sign = avg > 0 ? '+' : ''
                          return (
                            <td
                              key={jl}
                              title={`n=${cell.count}`}
                              className={`px-3 py-2.5 text-center font-semibold ${heatCell(avg)}`}
                            >
                              {sign}{avg.toFixed(1)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-right text-xs text-gray-400">
                Cell = avg weighted gap ((final×imp) − (standard×imp)). Hover for n.
              </p>
            </div>
          )
        })
      ) : (
        <p className="py-8 text-center text-sm text-gray-400">
          Gap heatmap will appear once employees submit assessments.
        </p>
      )}
    </div>
  )
}

function GapChip({ gap }: { gap: number }) {
  const cls =
    gap > 0  ? 'bg-green-50 text-green-700' :
    gap === 0 ? 'bg-gray-100 text-gray-600'  :
    'bg-red-50 text-red-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {gap > 0 ? `+${gap}` : gap}
    </span>
  )
}

function StatusPill({ status, type }: { status: string; type: 'self' | 'manager' }) {
  const selfCls: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-500',
    draft:       'bg-amber-50 text-amber-700',
    submitted:   'bg-green-50 text-green-700',
  }
  const mgCls: Record<string, string> = {
    pending:  'bg-gray-100 text-gray-500',
    reviewed: 'bg-green-50 text-green-700',
  }
  const cls = type === 'self' ? (selfCls[status] ?? selfCls.not_started) : (mgCls[status] ?? mgCls.pending)
  const label = status.replace('_', ' ')
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
