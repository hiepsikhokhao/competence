'use client'

import { useState, useTransition } from 'react'
import SkillRow from './SkillRow'
import { saveScore, saveEvidence, submitAssessment } from '@/app/actions/assessment'
import type { ProficiencyLevel } from '@/lib/types'

type Level = {
  level: number
  label: string | null
  description: string | null
  description_en: string | null
  description_vi: string | null
}

type Skill = {
  id: string
  name: string
  definition: string | null
  definition_en: string | null
  definition_vi: string | null
  levels: Level[]
}

type Props = {
  assessmentId:   string
  skills:         Skill[]
  initialScores:  Record<string, ProficiencyLevel>
  initialEvidence: Record<string, string>
  standards:      Record<string, ProficiencyLevel>  // skillId → required_level
  readOnly?:      boolean
}

export default function AssessmentForm({
  assessmentId,
  skills,
  initialScores,
  initialEvidence,
  standards,
  readOnly = false,
}: Props) {
  const [scores,   setScores]   = useState<Record<string, ProficiencyLevel>>(initialScores)
  const [evidence, setEvidence] = useState<Record<string, string>>(initialEvidence)

  const [saveError,    setSaveError]   = useState<string | null>(null)
  const [submitError,  setSubmitError] = useState<string | null>(null)
  const [isSaving,     startSave]      = useTransition()
  const [isSubmitting, startSubmit]    = useTransition()

  const ratedCount = skills.filter((s) => scores[s.id] != null).length
  const allRated   = ratedCount === skills.length && skills.length > 0

  // Evidence is mandatory when self_score > required_level
  function isMandatory(skillId: string): boolean {
    const score    = scores[skillId]
    const required = standards[skillId]
    return score != null && required != null && score > required
  }

  const missingEvidence = skills.filter(
    (s) => isMandatory(s.id) && !evidence[s.id]?.trim()
  )
  const canSubmit = allRated && missingEvidence.length === 0

  function handleScoreChange(skillId: string, score: number) {
    setScores((prev) => ({ ...prev, [skillId]: score as ProficiencyLevel }))
    setSaveError(null)
    startSave(async () => {
      const result = await saveScore(assessmentId, skillId, score as ProficiencyLevel)
      if (result?.error) setSaveError(result.error)
    })
  }

  function handleEvidenceChange(skillId: string, value: string) {
    setEvidence((prev) => ({ ...prev, [skillId]: value }))
  }

  function handleEvidenceBlur(skillId: string, value: string) {
    startSave(async () => {
      await saveEvidence(assessmentId, skillId, value)
    })
  }

  function handleSubmit() {
    setSubmitError(null)
    startSubmit(async () => {
      const result = await submitAssessment(assessmentId)
      if (result?.error) setSubmitError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {/* Progress + save indicator */}
      {!readOnly && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            <span className="font-medium text-gray-900">{ratedCount}</span>
            {' / '}
            {skills.length} skills rated
          </span>

          <span
            className={[
              'text-xs transition-opacity',
              isSaving ? 'text-[#0057D9] opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-live="polite"
          >
            Saving…
          </span>
        </div>
      )}

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
            definitionEn={skill.definition_en}
            definitionVi={skill.definition_vi}
            levels={skill.levels}
            currentScore={scores[skill.id] ?? null}
            onChange={handleScoreChange}
            disabled={readOnly || isSubmitting}
            evidence={evidence[skill.id] ?? ''}
            onEvidenceChange={handleEvidenceChange}
            onEvidenceSave={handleEvidenceBlur}
            isEvidenceMandatory={isMandatory(skill.id)}
          />
        ))}
      </div>

      {!readOnly && (
        <>
          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2" role="alert">
              {submitError}
            </p>
          )}

          {missingEvidence.length > 0 && allRated && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
              Evidence required for {missingEvidence.length} skill{missingEvidence.length > 1 ? 's' : ''} where your score exceeds the standard.
            </p>
          )}

          {/* Submit row */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting || isSaving}
              className="rounded-md bg-[#0057D9] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#003087] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Assessment'}
            </button>

            {!allRated && (
              <span className="text-xs text-gray-400">
                Rate all {skills.length} skills to enable submit
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
