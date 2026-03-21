import GapBadge from './GapBadge'
import { calcGap, PROFICIENCY_LABELS } from '@/lib/utils'
import type { ProficiencyLevel } from '@/lib/types'

export type GapRow = {
  skill_id:       string
  skill_name:     string
  self_score:     ProficiencyLevel | null
  final_score:    ProficiencyLevel | null
  required_level: ProficiencyLevel | null
}

type Props = { rows: GapRow[] }

// Simple CSS bar: blue fill = final score, orange tick = standard
function ScoreBar({
  score,
  standard,
}: {
  score: number | null
  standard: number | null
}) {
  const pct = (n: number) => `${(n / 4) * 100}%`
  return (
    <div className="relative h-2 w-28 rounded-full bg-gray-100 overflow-visible">
      {score != null && (
        <div
          className="h-full rounded-full bg-[#0057D9]"
          style={{ width: pct(score) }}
        />
      )}
      {standard != null && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-orange-400 rounded-full"
          style={{ left: pct(standard) }}
        />
      )}
    </div>
  )
}

export default function GapTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">No scores to display.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="pb-3 pr-6">Skill</th>
            <th className="pb-3 pr-6">Your Score</th>
            <th className="pb-3 pr-6">Final Score</th>
            <th className="pb-3 pr-6">Standard</th>
            <th className="pb-3 pr-6">
              <span className="inline-flex items-center gap-3 text-xs font-normal normal-case tracking-normal text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded-full bg-[#0057D9]" />
                  score
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-0.5 rounded-full bg-orange-400" />
                  standard
                </span>
              </span>
            </th>
            <th className="pb-3">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const gap = calcGap(row.final_score, row.required_level)
            const scoreChanged = row.final_score != null && row.self_score != null && row.final_score !== row.self_score
            return (
              <tr key={row.skill_id}>
                <td className="py-3 pr-6 font-medium text-gray-900">
                  {row.skill_name}
                </td>
                <td className="py-3 pr-6 text-gray-500">
                  {row.self_score != null
                    ? `${row.self_score} — ${PROFICIENCY_LABELS[row.self_score]}`
                    : '—'}
                </td>
                <td className="py-3 pr-6">
                  {row.final_score != null ? (
                    <span className={scoreChanged ? 'font-medium text-[#003087]' : 'text-gray-600'}>
                      {row.final_score} — {PROFICIENCY_LABELS[row.final_score]}
                      {scoreChanged && (
                        <span className="ml-1 text-xs text-[#6B7280]">(adjusted)</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 pr-6 text-gray-600">
                  {row.required_level != null
                    ? `${row.required_level} — ${PROFICIENCY_LABELS[row.required_level]}`
                    : '—'}
                </td>
                <td className="py-3 pr-6">
                  <ScoreBar score={row.final_score} standard={row.required_level} />
                </td>
                <td className="py-3">
                  <GapBadge gap={gap} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
