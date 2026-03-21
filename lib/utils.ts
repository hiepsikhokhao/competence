import type { ProficiencyLevel } from './types'

// ── Gap calculation ───────────────────────────────────────────────────────────

/**
 * gap > 0  → "Above standard"   (green)
 * gap = 0  → "Meeting standard" (gray)
 * gap < 0  → "Below standard"   (red)
 */
export function calcGap(
  finalScore: ProficiencyLevel | null,
  requiredLevel: ProficiencyLevel | null
): number | null {
  if (finalScore == null || requiredLevel == null) return null
  return finalScore - requiredLevel
}

export type GapStatus = 'above' | 'meeting' | 'below' | 'incomplete'

export function gapStatus(gap: number | null): GapStatus {
  if (gap == null) return 'incomplete'
  if (gap > 0)     return 'above'
  if (gap === 0)   return 'meeting'
  return 'below'
}

export const GAP_COLORS: Record<GapStatus, string> = {
  above:      'text-green-700 bg-green-50',
  meeting:    'text-gray-600 bg-gray-100',
  below:      'text-red-700 bg-red-50',
  incomplete: 'text-gray-400 bg-white',
}

// ── Score helpers ─────────────────────────────────────────────────────────────

export const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Basic',
  2: 'Developing',
  3: 'Proficient',
  4: 'Expert',
}

export const JOB_LEVELS = [
  '1.1', '1.2', '1.3',
  '2.1', '2.2', '2.3',
  '3.1',
] as const

export type JobLevel = (typeof JOB_LEVELS)[number]
