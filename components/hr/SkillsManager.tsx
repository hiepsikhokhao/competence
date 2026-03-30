'use client'

import { useState, useTransition } from 'react'
import { createSkill, updateSkill, deleteSkill, upsertStandard, upsertSkillLevel } from '@/app/actions/hr'
import { PROFICIENCY_LABELS } from '@/lib/utils'
import type { FunctionType, ProficiencyLevel } from '@/lib/types'

const FUNCTIONS: FunctionType[] = ['UA', 'MKT', 'LiveOps']
const LEVEL_LABELS: Record<number, string> = { 1: 'Basic', 2: 'Developing', 3: 'Proficient', 4: 'Expert' }

type SkillLevel = {
  level:       number
  label:       string | null
  description: string | null
}

type Skill = {
  id:         string
  name:       string
  definition: string | null
  function:   FunctionType
  levels:     SkillLevel[]
}

type Props = {
  initialSkills:    Skill[]
  initialStandards: Record<string, Record<string, number>>  // skillId → jobLevel → level
  jobLevels:        string[]
}

type View = 'skills' | 'matrix'

export default function SkillsManager({ initialSkills, initialStandards, jobLevels }: Props) {
  const [skills,     setSkills]     = useState<Skill[]>(initialSkills)
  const [standards,  setStandards]  = useState(initialStandards)
  const [view,       setView]       = useState<View>('skills')
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editDraft,  setEditDraft]  = useState({ definition: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingLevel, setEditingLevel] = useState<{ skillId: string; level: number } | null>(null)
  const [levelDraft,   setLevelDraft]   = useState('')
  const [error,      setError]      = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  // ── Add skill form ──────────────────────────────────────────────────────────
  const [addForm, setAddForm] = useState<{ name: string; definition: string; function: FunctionType }>({
    name: '', definition: '', function: 'UA',
  })

  function handleAdd() {
    if (!addForm.name.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await createSkill({
        name:       addForm.name.trim(),
        definition: addForm.definition.trim() || null,
        function:   addForm.function,
      })
      if (res.error) { setError(res.error); return }
      if (res.skill) {
        setSkills((prev) => [...prev, { ...res.skill!, levels: [] }].sort((a, b) => {
          if (a.function !== b.function) return a.function.localeCompare(b.function)
          return a.name.localeCompare(b.name)
        }))
        setAddForm((p) => ({ ...p, name: '', definition: '' }))
      }
    })
  }

  function startEdit(skill: Skill) {
    setEditingId(skill.id)
    setEditDraft({ definition: skill.definition ?? '' })
  }

  function handleUpdate(id: string) {
    setError(null)
    startTransition(async () => {
      const skill = skills.find((s) => s.id === id)
      if (!skill) return
      const res = await updateSkill(id, {
        name:       skill.name,           // name is not editable in v1.2
        definition: editDraft.definition || null,
      })
      if (res.error) { setError(res.error); return }
      setSkills((prev) =>
        prev.map((s) => s.id === id ? { ...s, definition: editDraft.definition || null } : s)
      )
      setEditingId(null)
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes all associated scores and standards.`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteSkill(id)
      if (res.error) { setError(res.error); return }
      setSkills((prev) => prev.filter((s) => s.id !== id))
      setStandards((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (expandedId === id) setExpandedId(null)
    })
  }

  function handleStandardChange(skillId: string, jl: string, value: string) {
    const lvl = value === '' ? null : parseInt(value) as ProficiencyLevel
    setStandards((prev) => {
      const skillStd = { ...(prev[skillId] ?? {}) }
      if (lvl === null) delete skillStd[jl]
      else              skillStd[jl] = lvl
      return { ...prev, [skillId]: skillStd }
    })
    startTransition(async () => {
      await upsertStandard(skillId, jl, lvl)
    })
  }

  function toggleExpand(skillId: string) {
    setExpandedId((prev) => (prev === skillId ? null : skillId))
    setEditingLevel(null)
  }

  function startEditLevel(skillId: string, level: number, currentDescription: string | null) {
    setEditingLevel({ skillId, level })
    setLevelDraft(currentDescription ?? '')
  }

  function handleSaveLevel(skillId: string, level: ProficiencyLevel) {
    setError(null)
    startTransition(async () => {
      const res = await upsertSkillLevel(skillId, level, { description: levelDraft || null })
      if (res.error) { setError(res.error); return }
      setSkills((prev) => prev.map((s) => {
        if (s.id !== skillId) return s
        const existingLevel = s.levels.find((l) => l.level === level)
        const newLevels = existingLevel
          ? s.levels.map((l) => l.level === level ? { ...l, description: levelDraft || null } : l)
          : [...s.levels, { level, label: null, description: levelDraft || null }]
        return { ...s, levels: newLevels }
      }))
      setEditingLevel(null)
    })
  }

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex gap-2">
        {(['skills', 'matrix'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              'rounded-md px-4 py-2 text-sm font-medium capitalize',
              view === v
                ? 'bg-[#0057D9] text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {v === 'skills' ? 'Skills' : 'Standards Matrix'}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* ── Skills view ──────────────────────────────────────────────────── */}
      {view === 'skills' && (
        <div className="space-y-5">
          {/* Add form */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">Add Skill</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Skill name"
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0057D9] focus:outline-none"
              />
              <input
                type="text"
                value={addForm.definition}
                onChange={(e) => setAddForm((p) => ({ ...p, definition: e.target.value }))}
                placeholder="Definition (optional)"
                className="min-w-0 flex-[2] rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0057D9] focus:outline-none"
              />
              <select
                value={addForm.function}
                onChange={(e) => setAddForm((p) => ({ ...p, function: e.target.value as FunctionType }))}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#0057D9] focus:outline-none"
              >
                {FUNCTIONS.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
              </select>
              <button
                onClick={handleAdd}
                disabled={isPending || !addForm.name.trim()}
                className="rounded-md bg-[#0057D9] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#003087] disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Skills grouped by function */}
          {FUNCTIONS.map((fn) => {
            const fnSkills = skills.filter((s) => s.function === fn)
            return (
              <div key={fn} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {fn} · {fnSkills.length} skill{fnSkills.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {fnSkills.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400">No skills yet.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {fnSkills.map((skill) => (
                        <>
                          <tr key={skill.id}>
                            {editingId === skill.id ? (
                              <>
                                {/* Name is read-only in edit mode (v1.2: only definition is editable) */}
                                <td className="px-6 py-2.5 font-medium text-gray-900 w-1/3">
                                  {skill.name}
                                </td>
                                <td className="px-6 py-2.5">
                                  <input
                                    type="text"
                                    value={editDraft.definition}
                                    onChange={(e) => setEditDraft({ definition: e.target.value })}
                                    placeholder="Definition"
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#0057D9] focus:outline-none"
                                  />
                                </td>
                                <td className="px-6 py-2.5 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleUpdate(skill.id)}
                                    disabled={isPending}
                                    className="mr-3 text-xs font-medium text-[#0057D9] hover:text-[#003087] disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="w-1/3 px-6 py-3 font-medium text-gray-900">
                                  <button
                                    onClick={() => toggleExpand(skill.id)}
                                    className="flex items-center gap-1.5 text-left hover:text-[#0057D9]"
                                  >
                                    <span className="text-gray-400 text-xs">
                                      {expandedId === skill.id ? '▼' : '▶'}
                                    </span>
                                    {skill.name}
                                  </button>
                                </td>
                                <td className="px-6 py-3 text-xs text-gray-500">
                                  {skill.definition ?? '—'}
                                </td>
                                <td className="px-6 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => startEdit(skill)}
                                    className="mr-3 text-xs font-medium text-[#0057D9] hover:text-[#003087]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(skill.id, skill.name)}
                                    disabled={isPending}
                                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>

                          {/* Expanded: proficiency level descriptions with inline editing */}
                          {expandedId === skill.id && editingId !== skill.id && (
                            <tr key={`${skill.id}-levels`}>
                              <td colSpan={3} className="bg-gray-50 px-6 py-4">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  {([1, 2, 3, 4] as const).map((lvl: ProficiencyLevel) => {
                                    const ld = skill.levels.find((l) => l.level === lvl)
                                    const isEditingThis =
                                      editingLevel?.skillId === skill.id && editingLevel.level === lvl

                                    return (
                                      <div
                                        key={lvl}
                                        className="rounded-lg border border-gray-200 bg-white p-3"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-xs font-bold text-[#0057D9]">{lvl}</p>
                                          {!isEditingThis && (
                                            <button
                                              onClick={() => startEditLevel(skill.id, lvl, ld?.description ?? null)}
                                              className="text-[10px] text-gray-400 hover:text-[#0057D9]"
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-800 leading-tight mb-1">
                                          {ld?.label ?? PROFICIENCY_LABELS[lvl]}
                                        </p>
                                        {isEditingThis ? (
                                          <div className="space-y-1">
                                            <textarea
                                              rows={3}
                                              value={levelDraft}
                                              onChange={(e) => setLevelDraft(e.target.value)}
                                              className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-xs focus:border-[#0057D9] focus:outline-none"
                                              placeholder="Description…"
                                            />
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleSaveLevel(skill.id, lvl)}
                                                disabled={isPending}
                                                className="text-[10px] font-medium text-[#0057D9] hover:text-[#003087] disabled:opacity-50"
                                              >
                                                Save
                                              </button>
                                              <button
                                                onClick={() => setEditingLevel(null)}
                                                className="text-[10px] text-gray-500 hover:text-gray-700"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          ld?.description ? (
                                            <p className="mt-1 text-xs text-gray-500 leading-tight">
                                              {ld.description}
                                            </p>
                                          ) : (
                                            <p className="mt-1 text-[10px] text-gray-300 italic">No description</p>
                                          )
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Standards matrix view ─────────────────────────────────────────── */}
      {view === 'matrix' && (
        <div className="space-y-5">
          <p className="text-xs text-gray-500">
            Set required proficiency level per skill × job level. Leave blank for no requirement.
          </p>
          {FUNCTIONS.map((fn) => {
            const fnSkills = skills.filter((s) => s.function === fn)
            if (fnSkills.length === 0) return null
            return (
              <div key={fn} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{fn}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="min-w-[180px] px-4 py-2.5 text-left font-semibold text-gray-600">
                          Skill
                        </th>
                        {jobLevels.map((jl) => (
                          <th key={jl} className="min-w-[96px] px-2 py-2.5 text-center font-semibold text-gray-600">
                            {jl}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {fnSkills.map((skill) => (
                        <tr key={skill.id}>
                          <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-700">
                            {skill.name}
                          </td>
                          {jobLevels.map((jl) => (
                            <td key={jl} className="px-2 py-1.5 text-center">
                              <select
                                value={standards[skill.id]?.[jl] ?? ''}
                                onChange={(e) => handleStandardChange(skill.id, jl, e.target.value)}
                                className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-700 focus:border-[#0057D9] focus:outline-none"
                              >
                                <option value="">—</option>
                                {([1, 2, 3, 4] as const).map((lvl) => (
                                  <option key={lvl} value={lvl}>
                                    {lvl} – {LEVEL_LABELS[lvl]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
