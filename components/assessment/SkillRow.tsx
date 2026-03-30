'use client'

import { PROFICIENCY_LABELS } from '@/lib/utils'
import { useLang } from '@/lib/hooks/useLang'

type Level = {
  level: number
  label: string | null
  description: string | null
  description_en: string | null
  description_vi: string | null
}

type Props = {
  skillId:            string
  name:               string
  definition:         string | null
  definitionEn:       string | null
  definitionVi:       string | null
  levels:             Level[]
  currentScore:       number | null
  onChange:           (skillId: string, score: number) => void
  disabled:           boolean
  evidence:           string
  onEvidenceChange:   (skillId: string, value: string) => void
  onEvidenceSave:     (skillId: string, value: string) => void
  isEvidenceMandatory: boolean
}

export default function SkillRow({
  skillId,
  name,
  definition,
  definitionEn,
  definitionVi,
  levels,
  currentScore,
  onChange,
  disabled,
  evidence,
  onEvidenceChange,
  onEvidenceSave,
  isEvidenceMandatory,
}: Props) {
  const [lang] = useLang()

  const def = lang === 'en' ? (definitionEn ?? definition) : (definitionVi ?? definition)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        {def && (
          <p className="mt-0.5 text-xs text-gray-500">{def}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([1, 2, 3, 4] as const).map((lvl) => {
          const levelData = levels.find((l) => l.level === lvl)
          const label     = levelData?.label ?? PROFICIENCY_LABELS[lvl]
          const desc      = lang === 'en' ? (levelData?.description_en ?? levelData?.description) : (levelData?.description_vi ?? levelData?.description)
          const checked   = currentScore === lvl

          return (
            <label
              key={lvl}
              className={[
                'flex flex-col gap-1 rounded-lg border-2 p-3 transition-colors',
                disabled && checked  ? 'cursor-default' : '',
                disabled && !checked ? 'cursor-not-allowed opacity-40' : '',
                !disabled            ? 'cursor-pointer hover:bg-blue-50' : '',
                checked ? 'border-[#0057D9] bg-blue-50' : 'border-gray-200',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`skill-${skillId}`}
                value={lvl}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(skillId, lvl)}
                className="sr-only"
              />
              <span className="text-xs font-bold text-[#0057D9]">{lvl}</span>
              <span className="text-xs font-medium text-gray-800 leading-tight">
                {label}
              </span>
              {desc && (
                <span className="text-xs text-gray-500 leading-tight">
                  {desc}
                </span>
              )}
            </label>
          )
        })}
      </div>

      {/* Evidence / Example field */}
      <div className="mt-3">
        <label className="block text-xs text-gray-500 mb-1">
          Evidence / Example
          {isEvidenceMandatory && (
            <span className="ml-1 text-red-500 font-medium">* Required (score exceeds standard)</span>
          )}
        </label>
        <textarea
          rows={2}
          value={evidence}
          disabled={disabled}
          onChange={(e) => onEvidenceChange(skillId, e.target.value)}
          onBlur={(e) => onEvidenceSave(skillId, e.target.value)}
          placeholder="Briefly describe a situation that demonstrates this level…"
          className={[
            'w-full resize-none rounded-md border px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#0057D9] transition-colors',
            isEvidenceMandatory && !evidence.trim()
              ? 'border-red-400 bg-red-50'
              : 'border-gray-200 bg-gray-50',
            disabled ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        />
      </div>
    </div>
  )
}
