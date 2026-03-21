'use client'

import { useState, useTransition } from 'react'
import SkillRow from './SkillRow'
import { saveScore, submitAssessment } from '@/app/actions/assessment'
import type { ProficiencyLevel } from '@/lib/types'

type Level = {
  level: number
  label: string | null
  description: string | null
}

type Skill = {
  id: string
  name: string
  definition: string | null
  levels: Level[]
}

type Props = {
  assessmentId: string
  skills: Skill[]
  initialScores: Record<string, ProficiencyLevel>
}

export default function AssessmentForm({ assessmentId, skills, initialScores }: Props) {
  const [scores, setScores] = useState<Record<string, ProficiencyLevel>>(initialScores)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()
  const [isSubmitting, startSubmit] = useTransition()

  const ratedCount = skills.filter((s) => scores[s.id] != null).length
  const allRated = ratedCount === skills.length && skills.length > 0

  function handleScoreChange(skillId: string, score: number) {
    setScores((prev) => ({ ...prev, [skillId]: score as ProficiencyLevel }))
    setSaveError(null)
    startSave(async () => {
      const result = await saveScore(assessmentId, skillId, score as ProficiencyLevel)
      if (result?.error) setSaveError(result.error)
    })
  }

  function handleSubmit() {
    setSubmitError(null)
    startSubmit(async () => {
      const result = await submitAssessment(assessmentId)
      if (result?.error) setSubmitError(result.error)
      // On success, revalidatePath('/employee') in the server action causes Next.js
      // to return an updated RSC payload, swapping this form for GapTable.
    })
  }

  return (
    <div className="space-y-6">
      {/* Progress + save indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          <span className="font-medium text-gray-900">{ratedCount}</span>
          {' / '}
          {skills.length} skills rated
        </span>

        <span
          className={[
            'text-xs transition-opacity',
            isSaving ? 'text-indigo-500 opacity-100' : 'opacity-0',
          ].join(' ')}
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

      {/* Skill rows */}
      <div className="space-y-4">
        {skills.map((skill) => (
          <SkillRow
            key={skill.id}
            skillId={skill.id}
            name={skill.name}
            definition={skill.definition}
            levels={skill.levels}
            currentScore={scores[skill.id] ?? null}
            onChange={handleScoreChange}
            disabled={isSubmitting}
          />
        ))}
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2" role="alert">
          {submitError}
        </p>
      )}

      {/* Submit row */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allRated || isSubmitting || isSaving}
          className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting…' : 'Submit Assessment'}
        </button>

        {!allRated && (
          <span className="text-xs text-gray-400">
            Rate all {skills.length} skills to enable submit
          </span>
        )}
      </div>
    </div>
  )
}
