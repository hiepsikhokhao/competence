'use client'

import { PROFICIENCY_LABELS } from '@/lib/utils'

type Level = {
  level: number
  label: string | null
  description: string | null
}

type Props = {
  skillId: string
  name: string
  definition: string | null
  levels: Level[]
  currentScore: number | null
  onChange: (skillId: string, score: number) => void
  disabled: boolean
}

export default function SkillRow({
  skillId,
  name,
  definition,
  levels,
  currentScore,
  onChange,
  disabled,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        {definition && (
          <p className="mt-0.5 text-xs text-gray-500">{definition}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([1, 2, 3, 4] as const).map((lvl) => {
          const levelData = levels.find((l) => l.level === lvl)
          const label = levelData?.label ?? PROFICIENCY_LABELS[lvl]
          const description = levelData?.description ?? null
          const checked = currentScore === lvl

          return (
            <label
              key={lvl}
              className={[
                'flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 transition-colors',
                disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-indigo-50',
                checked
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200',
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
              <span className="text-xs font-bold text-indigo-700">{lvl}</span>
              <span className="text-xs font-medium text-gray-800 leading-tight">
                {label}
              </span>
              {description && (
                <span className="text-xs text-gray-500 leading-tight">
                  {description}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}
