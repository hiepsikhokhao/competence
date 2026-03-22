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

function computeRow(row: GapRow) {
  const standardScore =
    row.required_level != null && row.importance != null
      ? row.required_level * row.importance
      : null
  const actualScore =
    row.final_score != null && row.importance != null
      ? row.final_score * row.importance
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

// ── Main component ────────────────────────────────────────────────────────────

type Props = { rows: GapRow[] }

export default function GapTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No scores to display.</p>
  }

  const computed = rows.map(computeRow)

  // Totals
  const totalStandard = computed.reduce((s, r) => s + (r.standardScore ?? 0), 0)
  const totalActual   = computed.reduce((s, r) => s + (r.actualScore   ?? 0), 0)
  const totalGap      = computed.reduce((s, r) => s + (r.gap           ?? 0), 0)
  const hasWeighted   = computed.some((r) => r.standardScore != null)

  // Radar data (no importance weighting — raw proficiency levels)
  const hasRequired = rows.some((r) => r.required_level != null)
  const radarData   = computed.map((r) => ({
    skill:      r.skill_name.length > 14 ? r.skill_name.slice(0, 13) + '…' : r.skill_name,
    'Actual':   r.final_score    ?? 0,
    'Standard': r.required_level ?? 0,
  }))

  return (
    <div className="space-y-6">
      {/* ── Gap table ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 whitespace-nowrap">Skill</th>
              <th className="px-4 py-3 whitespace-nowrap">Self Score</th>
              <th className="px-4 py-3 whitespace-nowrap">Manager Score</th>
              <th className="px-4 py-3 whitespace-nowrap">Standard</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Importance</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Standard Score</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Actual Score</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {computed.map((row) => (
              <tr key={row.skill_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {row.skill_name}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {row.self_score != null
                    ? `${row.self_score} — ${PROFICIENCY_LABELS[row.self_score]}`
                    : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {row.manager_score != null ? (
                    <span className={row.manager_score !== row.self_score ? 'font-medium text-[#003087]' : 'text-gray-600'}>
                      {row.manager_score} — {PROFICIENCY_LABELS[row.manager_score]}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {row.required_level != null
                    ? `${row.required_level} — ${PROFICIENCY_LABELS[row.required_level]}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.importance != null ? (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {row.importance}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                  {row.standardScore ?? '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums font-medium">
                  {row.actualScore ?? '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <GapChip gap={row.gap} />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          {hasWeighted && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 text-xs font-semibold text-gray-700">
                <td className="px-4 py-3" colSpan={5}>Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{totalStandard}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold">{totalActual}</td>
                <td className="px-4 py-3 text-center">
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
                domain={[0, 4]}
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
