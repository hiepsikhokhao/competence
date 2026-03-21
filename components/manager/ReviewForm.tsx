'use client'

import { useState, useTransition } from 'react'
import { saveManagerScore, submitManagerReview } from '@/app/actions/manager'
import { calcGap, PROFICIENCY_LABELS } from '@/lib/utils'
import GapBadge from '@/components/gap/GapBadge'
import type { ProficiencyLevel } from '@/lib/types'

export type ReviewRow = {
  skill_id:       string
  skill_name:     string
  self_score:     ProficiencyLevel | null
  manager_score:  ProficiencyLevel | null
  required_level: ProficiencyLevel | null
}

type Props = {
  assessmentId: string
  rows:         ReviewRow[]
  isReviewed:   boolean
}

export default function ReviewForm({ assessmentId, rows, isReviewed }: Props) {
  const [scores, setScores] = useState<Record<string, ProficiencyLevel | null>>(
    Object.fromEntries(rows.map((r) => [r.skill_id, r.manager_score]))
  )
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving,    startSave]      = useTransition()
  const [isSubmitting, startSubmit]   = useTransition()

  const allScored = rows.every((r) => scores[r.skill_id] != null)

  function handleScoreChange(skillId: string, score: ProficiencyLevel) {
    setScores((prev) => ({ ...prev, [skillId]: score }))
    setSaveError(null)
    startSave(async () => {
      const result = await saveManagerScore(assessmentId, skillId, score)
      if (result?.error) setSaveError(result.error)
    })
  }

  function handleSubmit() {
    setSubmitError(null)
    startSubmit(async () => {
      const result = await submitManagerReview(assessmentId)
      if (result?.error) setSubmitError(result.error)
      // On success, revalidatePath('/manager') in the server action refreshes the page
    })
  }

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      <div className="flex items-center justify-end">
        <span
          className={['text-xs transition-opacity', isSaving ? 'text-indigo-500 opacity-100' : 'opacity-0'].join(' ')}
          aria-live="polite"
        >
          Saving…
        </span>
      </div>

      {saveError && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2" role="alert">
          Save error: {saveError}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-6">Skill</th>
              <th className="pb-3 pr-6">Self Score</th>
              <th className="pb-3 pr-6">Manager Score</th>
              <th className="pb-3 pr-6">Standard</th>
              <th className="pb-3">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const managerScore = scores[row.skill_id]
              const finalScore   = managerScore ?? row.self_score
              const gap          = calcGap(finalScore ?? null, row.required_level)

              return (
                <tr key={row.skill_id}>
                  <td className="py-3 pr-6 font-medium text-gray-900">{row.skill_name}</td>

                  <td className="py-3 pr-6 text-gray-500">
                    {row.self_score != null
                      ? `${row.self_score} — ${PROFICIENCY_LABELS[row.self_score]}`
                      : '—'}
                  </td>

                  <td className="py-3 pr-6">
                    {isReviewed ? (
                      <span className="text-gray-700">
                        {managerScore != null
                          ? `${managerScore} — ${PROFICIENCY_LABELS[managerScore]}`
                          : '—'}
                      </span>
                    ) : (
                      <select
                        value={managerScore ?? ''}
                        disabled={isSubmitting}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) as ProficiencyLevel
                          if (val >= 1 && val <= 4) handleScoreChange(row.skill_id, val)
                        }}
                        className="rounded-md border border-gray-300 py-1 pl-2 pr-8 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">— Rate —</option>
                        {([1, 2, 3, 4] as const).map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl} — {PROFICIENCY_LABELS[lvl]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="py-3 pr-6 text-gray-500">
                    {row.required_level != null
                      ? `${row.required_level} — ${PROFICIENCY_LABELS[row.required_level]}`
                      : '—'}
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

      {!isReviewed && (
        <>
          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allScored || isSubmitting || isSaving}
              className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Review'}
            </button>
            {!allScored && (
              <span className="text-xs text-gray-400">
                Score all {rows.length} skills to enable submit
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
