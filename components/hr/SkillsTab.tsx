import { prisma } from '@/lib/prisma'
import SkillsManager from './SkillsManager'
import { JOB_LEVELS } from '@/lib/utils'
import type { FunctionType } from '@/lib/types'

export default async function SkillsTab() {
  const [skillsRaw, stdRaw, levelsRaw] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ function: 'asc' }, { name: 'asc' }] }),
    prisma.skillStandard.findMany(),
    prisma.skillLevel.findMany({ orderBy: { level: 'asc' } }),
  ])

  const skillsData = skillsRaw as {
    id: string; name: string; definition: string | null; function: FunctionType
  }[]

  const standards: Record<string, Record<string, number>> = {}
  for (const s of stdRaw) {
    standards[s.skillId]              ??= {}
    standards[s.skillId][s.jobLevel]   = s.requiredLevel
  }

  const levelsMap: Record<string, { level: number; label: string | null; description: string | null }[]> = {}
  for (const l of levelsRaw) {
    levelsMap[l.skillId] ??= []
    levelsMap[l.skillId].push({ level: l.level, label: l.label, description: l.description })
  }

  const skills = skillsData.map((s) => ({
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
