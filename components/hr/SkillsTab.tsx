import { createServerSupabaseClient } from '@/lib/supabase'
import SkillsManager from './SkillsManager'
import { JOB_LEVELS } from '@/lib/utils'
import type { FunctionType } from '@/lib/types'

export default async function SkillsTab() {
  const supabase = await createServerSupabaseClient()

  const [skillsRes, stdRes, levelsRes] = await Promise.all([
    supabase.from('skills').select('id, name, definition, function').order('function').order('name'),
    supabase.from('skill_standards').select('skill_id, job_level, required_level'),
    supabase.from('skill_levels').select('skill_id, level, label, description').order('level'),
  ])

  const skillsRaw = (skillsRes.data ?? []) as {
    id: string; name: string; definition: string | null; function: FunctionType
  }[]

  const standards: Record<string, Record<string, number>> = {}
  for (const s of stdRes.data ?? []) {
    standards[s.skill_id]              ??= {}
    standards[s.skill_id][s.job_level]   = s.required_level
  }

  // Build levels map: skillId → sorted level rows
  const levelsMap: Record<string, { level: number; label: string | null; description: string | null }[]> = {}
  for (const l of levelsRes.data ?? []) {
    levelsMap[l.skill_id] ??= []
    levelsMap[l.skill_id].push(l)
  }

  const skills = skillsRaw.map((s) => ({
    ...s,
    levels: levelsMap[s.id] ?? [],
  }))

  return (
    <SkillsManager
      initialSkills={skills}
      initialStandards={standards}
      jobLevels={[...JOB_LEVELS]}
    />
  )
}
