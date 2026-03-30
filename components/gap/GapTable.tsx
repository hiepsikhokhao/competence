'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ProficiencyLevel } from '@/lib/types'

export type GapRow = {
  skill_id:       string
  skill_name:     string
  self_score:     ProficiencyLevel | null
  manager_score:  ProficiencyLevel | null
  final_score:    ProficiencyLevel | null   // manager_score ?? self_score (DB generated)
  required_level: ProficiencyLevel | null
  importance:     number | null             // 1 | 2 | 3 from skills table
}

// ── Derived calculations ──────────────────────────────────────────────────────

function computeRow(row: GapRow, managerReviewed: boolean) {
  // When pending: base actual score on self_score only (manager hasn't scored yet).
  // When reviewed: use final_score (= manager_score ?? self_score from DB).
  const effectiveScore = managerReviewed ? row.final_score : row.self_score

  const standardScore =
    row.required_level != null && row.importance != null
      ? row.required_level * row.importance
      : null
  const actualScore =
    effectiveScore != null && row.importance != null
      ? effectiveScore * row.importance
      : null
  const gap =
    actualScore != null && standardScore != null
      ? actualScore - standardScore
      : null
  return { ...row, standardScore, actualScore, gap }
}

// ── Gap chip ─────────────────────────────────────────────────────────────────

function GapChip({ gap }: { gap: number | null }) {
  const cls =
    gap == null  ? 'text-gray-400 bg-white' :
    gap > 0      ? 'text-green-700 bg-green-50' :
    gap === 0    ? 'text-gray-600 bg-gray-100'  :
                   'text-red-700 bg-red-50'
  const label =
    gap == null  ? '—' :
    gap > 0      ? `+${gap}` :
    String(gap)
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

// ── Manager score cell ────────────────────────────────────────────────────────
// When pending: always "—" (manager hasn't scored yet).
// When reviewed: show manager_score with colour highlight if it differs from self_score.

function ManagerScoreCell({ row, managerReviewed }: { row: GapRow; managerReviewed: boolean }) {
  if (!managerReviewed) return <span className="text-gray-400">—</span>

  const score = row.manager_score ?? row.self_score
  if (score == null) return <span className="text-gray-400">—</span>

  const hasDiff =
    row.manager_score != null &&
    row.self_score    != null &&
    row.manager_score !== row.self_score

  if (!hasDiff) return <span className="text-gray-600">{score}</span>

  const cls = row.manager_score! > row.self_score!
    ? 'inline-flex items-center rounded px-2 py-0.5 bg-green-100 text-green-700 font-semibold text-xs'
    : 'inline-flex items-center rounded px-2 py-0.5 bg-red-100 text-red-700 font-semibold text-xs'

  return <span className={cls}>{score}</span>
}

// ── Shared cell class helpers ─────────────────────────────────────────────────

const TH  = 'px-4 py-3 whitespace-nowrap border-r border-[#E5E7EB]'
const THL = `${TH} text-left`
const THC = `${TH} text-center`
const TH_LAST = 'px-4 py-3 whitespace-nowrap text-center'  // no right border

const TD  = 'px-4 py-3 border-r border-[#E5E7EB]'
const TDL = `${TD} whitespace-nowrap`
const TDC = `${TD} text-center whitespace-nowrap tabular-nums`
const TD_LAST = 'px-4 py-3 text-center'

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  rows:            GapRow[]
  managerReviewed: boolean   // controls Manager Score display + Actual Score source
}

export default function GapTable({ rows, managerReviewed }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No scores to display.</p>
  }

  const computed = rows.map((r) => computeRow(r, managerReviewed))

  // Totals
  const totalStandard = computed.reduce((s, r) => s + (r.standardScore ?? 0), 0)
  const totalActual   = computed.reduce((s, r) => s + (r.actualScore   ?? 0), 0)
  const totalGap      = computed.reduce((s, r) => s + (r.gap           ?? 0), 0)
  const hasWeighted   = computed.some((r) => r.standardScore != null)

  // Radar data — weighted scores (×importance per spec v1.2)
  const hasRequired = rows.some((r) => r.required_level != null)
  const radarData   = computed.map((r) => ({
    skill:      r.skill_name.length > 14 ? r.skill_name.slice(0, 13) + '…' : r.skill_name,
    'Actual':   r.actualScore   ?? 0,
    'Standard': r.standardScore ?? 0,
  }))
  const radarMax = Math.max(...radarData.flatMap((d) => [d['Actual'], d['Standard']]), 4)

  return (
    <div className="space-y-6">
      {/* ── Gap table ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className={THL}>Skill</th>
              <th className={THC}>Self Score</th>
              <th className={THC}>Manager Score</th>
              <th className={THC}>Standard</th>
              <th className={THC}>Importance</th>
              <th className={THC}>Standard Score</th>
              <th className={THC}>Actual Score</th>
              <th className={TH_LAST}>Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {computed.map((row) => (
              <tr key={row.skill_id} className="hover:bg-gray-50">
                <td className={`${TDL} font-medium text-gray-900`}>
                  {row.skill_name}
                </td>
                <td className={`${TDC} text-gray-500`}>
                  {row.self_score ?? '—'}
                </td>
                <td className={TDC}>
                  <ManagerScoreCell row={row} managerReviewed={managerReviewed} />
                </td>
                <td className={`${TDC} text-gray-500`}>
                  {row.required_level ?? '—'}
                </td>
                <td className={TDC}>
                  {row.importance != null ? (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {row.importance}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={`${TDC} text-gray-600`}>
                  {row.standardScore ?? '—'}
                </td>
                <td className={`${TDC} text-gray-700 font-medium`}>
                  {row.actualScore ?? '—'}
                </td>
                <td className={TD_LAST}>
                  <GapChip gap={row.gap} />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          {hasWeighted && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 text-xs font-semibold text-gray-700">
                <td className={`${TDL} py-3`} colSpan={5}>Total</td>
                <td className={`${TDC}`}>{totalStandard}</td>
                <td className={`${TDC} font-bold`}>{totalActual}</td>
                <td className={TD_LAST}>
                  <GapChip gap={totalGap} />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Radar chart ────────────────────────────────────────────────────── */}
      {hasRequired && radarData.length >= 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Score vs. Standard
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#374151' }} />
              <PolarRadiusAxis
                domain={[0, radarMax]}
                tickCount={5}
                tick={{ fontSize: 9, fill: '#9CA3AF' }}
                axisLine={false}
              />
              <Radar
                name="Standard"
                dataKey="Standard"
                stroke="#F97316"
                fill="#F97316"
                fillOpacity={0.12}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <Radar
                name="Actual"
                dataKey="Actual"
                stroke="#0057D9"
                fill="#0057D9"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasRequired && radarData.length < 3 && (
        <p className="text-xs text-gray-400 italic">
          Radar chart requires at least 3 skills to render.
        </p>
      )}
    </div>
  )
}
