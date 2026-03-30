'use client'

import { useState, useTransition } from 'react'
import { saveManagerScore, submitManagerReview } from '@/app/actions/manager'
import { PROFICIENCY_LABELS } from '@/lib/utils'
import ReviewGapAnalysis from './ReviewGapAnalysis'
import { useLang } from '@/lib/hooks/useLang'
import type { ProficiencyLevel } from '@/lib/types'

export type ReviewRow = {
  skill_id:       string
  skill_name:     string
  definition:     string | null
  definition_en:  string | null
  definition_vi:  string | null
  levels:         { level: number; label: string | null; description: string | null; description_en: string | null; description_vi: string | null }[]
  self_score:     ProficiencyLevel | null
  manager_score:  ProficiencyLevel | null
  required_level: ProficiencyLevel | null
  importance:     number | null
  evidence:       string | null
}

type Props = {
  assessmentId: string
  rows:         ReviewRow[]
  isReviewed:   boolean
}

export default function ReviewForm({ assessmentId, rows, isReviewed }: Props) {
  const [lang] = useLang()

  // Pre-fill manager score with self_score when no manager_score is saved yet
  const [scores, setScores] = useState<Record<string, ProficiencyLevel | null>>(
    Object.fromEntries(rows.map((r) => [r.skill_id, r.manager_score ?? r.self_score]))
  )
  const [saveError,    setSaveError]   = useState<string | null>(null)
  const [submitError,  setSubmitError] = useState<string | null>(null)
  const [isSaving,     startSave]      = useTransition()
  const [isSubmitting, startSubmit]    = useTransition()

  const allScored   = rows.every((r) => scores[r.skill_id] != null)
  const hasAdjusted = rows.some((r) => {
    const ms = scores[r.skill_id]
    return ms != null && r.self_score != null && ms !== r.self_score
  })

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
    })
  }

  return (
    <div className="space-y-5">
      {/* Warning banner */}
      {!isReviewed && hasAdjusted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have adjusted scores. Please discuss with the employee before submitting.
        </div>
      )}

      {/* Save indicator */}
      <div className="flex items-center justify-end h-4">
        <span
          className={['text-xs transition-opacity', isSaving ? 'opacity-100 text-[#0057D9]' : 'opacity-0'].join(' ')}
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

      {/* Skill cards */}
      <div className="space-y-4">
        {rows.map((row) => {
          const currentScore = scores[row.skill_id]
          return (
            <div key={row.skill_id} className="rounded-lg border border-gray-200 bg-white p-4">
              {/* Skill header */}
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">{row.skill_name}</p>
                {row.definition && (
                  <p className="mt-0.5 text-xs text-gray-500">{lang === 'en' ? (row.definition_en ?? row.definition) : (row.definition_vi ?? row.definition)}</p>
                )}
                {row.self_score != null && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Employee self-score:{' '}
                    <span className="font-medium text-gray-700">
                      {row.self_score} — {PROFICIENCY_LABELS[row.self_score]}
                    </span>
                  </p>
                )}
                {row.evidence && (
                  <p className="mt-1 text-xs italic text-gray-400">
                    Employee&apos;s evidence: {row.evidence}
                  </p>
                )}
              </div>

              {/* Level radio cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([1, 2, 3, 4] as const).map((lvl) => {
                  const levelData   = row.levels.find((l) => l.level === lvl)
                  const label       = levelData?.label ?? PROFICIENCY_LABELS[lvl]
                  const description = lang === 'en' ? (levelData?.description_en ?? levelData?.description) : (levelData?.description_vi ?? levelData?.description)
                  const checked     = currentScore === lvl
                  const isSelfScore = row.self_score === lvl

                  return (
                    <label
                      key={lvl}
                      className={[
                        'relative flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 transition-colors',
                        isReviewed ? 'cursor-default' : 'hover:bg-blue-50',
                        checked
                          ? 'border-[#0057D9] bg-blue-50'
                          : 'border-gray-200',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={`review-${row.skill_id}`}
                        value={lvl}
                        checked={checked}
                        disabled={isReviewed || isSubmitting}
                        onChange={() => !isReviewed && handleScoreChange(row.skill_id, lvl)}
                        className="sr-only"
                      />
                      {isSelfScore && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 leading-none">
                          Self
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#0057D9]">{lvl}</span>
                      <span className="text-xs font-medium text-gray-800 leading-tight">{label}</span>
                      {description && (
                        <span className="text-xs text-gray-500 leading-tight">{description}</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
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
              className="rounded-md bg-[#0057D9] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#003087] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Gap Analysis — shown alongside review form (calibration reference before submit, final results after) */}
      <ReviewGapAnalysis rows={rows} scores={scores} />
    </div>
  )
}
