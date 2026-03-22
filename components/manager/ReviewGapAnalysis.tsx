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
import { PROFICIENCY_LABELS } from '@/lib/utils'
import type { ReviewRow } from './ReviewForm'
import type { ProficiencyLevel } from '@/lib/types'

type Props = {
  rows:   ReviewRow[]
  scores: Record<string, ProficiencyLevel | null>
}

function gapColor(gap: number | null): string {
  if (gap == null) return 'text-gray-400 bg-white'
  if (gap > 0)     return 'text-green-700 bg-green-50'
  if (gap === 0)   return 'text-gray-600 bg-gray-100'
  return 'text-red-700 bg-red-50'
}

function gapLabel(gap: number | null): string {
  if (gap == null) return '—'
  if (gap > 0)     return `+${gap}`
  return String(gap)
}

export default function ReviewGapAnalysis({ rows, scores }: Props) {
  // Build per-row derived values
  const analysisRows = rows.map((row) => {
    const managerScore = scores[row.skill_id] ?? null
    const finalScore   = (managerScore ?? row.self_score) as ProficiencyLevel | null
    const gap =
      finalScore != null && row.required_level != null
        ? finalScore - row.required_level
        : null
    return { ...row, managerScore, finalScore, gap }
  })

  // Radar chart data — truncate long skill names for readability
  const radarData = analysisRows.map((r) => ({
    skill:      r.skill_name.length > 14 ? r.skill_name.slice(0, 13) + '…' : r.skill_name,
    'Final Score': r.finalScore ?? 0,
    'Required':    r.required_level ?? 0,
  }))

  const hasRequiredLevels = rows.some((r) => r.required_level != null)

  return (
    <div className="mt-8 space-y-6 border-t border-gray-200 pt-6">
      <h3 className="text-sm font-semibold text-gray-900">Gap Analysis</h3>

      {/* ── Gap table ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Skill</th>
              <th className="px-4 py-3">Self Score</th>
              <th className="px-4 py-3">Manager Score</th>
              <th className="px-4 py-3">Standard</th>
              <th className="px-4 py-3">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {analysisRows.map((row) => (
              <tr key={row.skill_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {row.skill_name}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {row.self_score != null
                    ? `${row.self_score} — ${PROFICIENCY_LABELS[row.self_score]}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {row.managerScore != null
                    ? `${row.managerScore} — ${PROFICIENCY_LABELS[row.managerScore]}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {row.required_level != null
                    ? `${row.required_level} — ${PROFICIENCY_LABELS[row.required_level]}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${gapColor(row.gap)}`}
                  >
                    {gapLabel(row.gap)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Radar chart ───────────────────────────────────────────────────── */}
      {hasRequiredLevels && radarData.length >= 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Score vs. Standard
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11, fill: '#374151' }}
              />
              <PolarRadiusAxis
                domain={[0, 4]}
                tickCount={5}
                tick={{ fontSize: 9, fill: '#9CA3AF' }}
                axisLine={false}
              />
              <Radar
                name="Final Score"
                dataKey="Final Score"
                stroke="#0057D9"
                fill="#0057D9"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name="Required"
                dataKey="Required"
                stroke="#F97316"
                fill="#F97316"
                fillOpacity={0.12}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasRequiredLevels && radarData.length < 3 && (
        <p className="text-xs text-gray-400 italic">
          Radar chart requires at least 3 skills to render.
        </p>
      )}

      {!hasRequiredLevels && (
        <p className="text-xs text-gray-400 italic">
          No required levels set for this employee's job level — contact HR to configure skill standards.
        </p>
      )}
    </div>
  )
}
