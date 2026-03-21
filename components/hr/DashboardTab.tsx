import { createServerSupabaseClient } from '@/lib/supabase'
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

export default async function DashboardTab() {
  const supabase = await createServerSupabaseClient()

  const [usersRes, assRes, scoresRes, skillsRes, stdRes] = await Promise.all([
    supabase.from('users').select('id, function, job_level').eq('role', 'employee'),
    supabase.from('assessments').select('id, employee_id, self_status, manager_status'),
    supabase.from('assessment_scores').select('assessment_id, skill_id, final_score'),
    supabase.from('skills').select('id, name, function').order('name'),
    supabase.from('skill_standards').select('skill_id, job_level, required_level'),
  ])

  const users     = usersRes.data   ?? []
  const asmts     = assRes.data     ?? []
  const scores    = scoresRes.data  ?? []
  const skills    = skillsRes.data  ?? []
  const standards = stdRes.data     ?? []

  const assmtByEmployee = Object.fromEntries(asmts.map((a) => [a.employee_id, a]))
  const assmtById       = Object.fromEntries(asmts.map((a) => [a.id, a]))
  const userById        = Object.fromEntries(users.map((u) => [u.id, u]))
  const stdMap          = Object.fromEntries(
    standards.map((s) => [`${s.skill_id}:${s.job_level}`, s.required_level as ProficiencyLevel])
  )

  // ── Completion stats per function ─────────────────────────────────────────
  const completion = FUNCTIONS.map((fn) => {
    const fnUsers  = users.filter((u) => u.function === fn)
    const submitted = fnUsers.filter((u) => assmtByEmployee[u.id]?.self_status    === 'submitted').length
    const reviewed  = fnUsers.filter((u) => assmtByEmployee[u.id]?.manager_status === 'reviewed').length
    return { fn, total: fnUsers.length, submitted, reviewed }
  })

  // ── Gap heatmap: skill × job_level → avg gap ──────────────────────────────
  // heatmap[fn][skillId][jobLevel] = { sum, count }
  type Cell = { sum: number; count: number }
  const heatmap: Record<FunctionType, Record<string, Record<string, Cell>>> = {
    UA: {}, MKT: {}, LiveOps: {},
  }

  for (const sc of scores) {
    if (sc.final_score == null) continue
    const asmt = assmtById[sc.assessment_id]
    if (!asmt || asmt.self_status !== 'submitted') continue
    const user = userById[asmt.employee_id]
    if (!user?.function || !user?.job_level) continue

    const fn       = user.function as FunctionType
    const skill    = skills.find((s) => s.id === sc.skill_id)
    if (!skill || skill.function !== fn) continue

    const required = stdMap[`${sc.skill_id}:${user.job_level}`]
    if (required == null) continue

    const gap = sc.final_score - required
    heatmap[fn][sc.skill_id]             ??= {}
    heatmap[fn][sc.skill_id][user.job_level] ??= { sum: 0, count: 0 }
    heatmap[fn][sc.skill_id][user.job_level].sum   += gap
    heatmap[fn][sc.skill_id][user.job_level].count += 1
  }

  const activeJobLevels = [...JOB_LEVELS].filter((jl) =>
    users.some((u) => u.job_level === jl)
  )

  const anySubmitted = asmts.some((a) => a.self_status === 'submitted')

  return (
    <div className="space-y-8">

      {/* ── Completion cards ─────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Completion
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {completion.map(({ fn, total, submitted, reviewed }) => {
            const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
            return (
              <div key={fn} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{fn}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{pct}%</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {submitted}/{total} submitted · {reviewed} reviewed
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Gap heatmaps ──────────────────────────────────────────────────── */}
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
                              <td key={jl} className="px-3 py-2.5 text-center text-gray-300">
                                —
                              </td>
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
                Cell = avg gap (final − standard). Hover for n.
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
