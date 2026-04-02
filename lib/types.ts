// ─── Scalar enums ─────────────────────────────────────────────────────────────

export type UserRole     = 'employee' | 'manager' | 'hr'
export type FunctionType = 'UA' | 'MKT' | 'LiveOps'
export type SelfStatus    = 'not_started' | 'draft' | 'submitted'
export type ManagerStatus = 'pending' | 'reviewed'
export type CycleStatus   = 'open' | 'closed'

/** Skill proficiency scale: 1 Basic → 2 Developing → 3 Proficient → 4 Expert */
export type ProficiencyLevel = 1 | 2 | 3 | 4

// ─── Table row types (snake_case for compatibility with existing components) ──

export type User = {
  id:         string
  name:       string
  email:      string
  username:   string | null
  role:       UserRole
  dept:       string | null
  function:   FunctionType | null
  job_level:  string | null
  manager_id: string | null
  created_at: string
}

export type Skill = {
  id:         string
  name:       string
  definition: string | null
  function:   FunctionType
  importance?: number | null
}

export type SkillLevel = {
  id:          string
  skill_id:    string
  level:       ProficiencyLevel
  label:       string | null
  description: string | null
}

export type SkillStandard = {
  skill_id:       string
  job_level:      string
  required_level: ProficiencyLevel
}

export type Cycle = {
  id:        string
  name:      string
  status:    CycleStatus
  opened_at: string | null
  closed_at: string | null
}

export type Assessment = {
  id:                  string
  cycle_id:            string
  employee_id:         string
  self_status:         SelfStatus
  manager_status:      ManagerStatus
  self_submitted_at:   string | null
  manager_reviewed_at: string | null
}

export type AssessmentScore = {
  assessment_id: string
  skill_id:      string
  self_score:    ProficiencyLevel | null
  manager_score: ProficiencyLevel | null
  final_score:   ProficiencyLevel | null
  evidence:      string | null
}

// ─── Derived / joined types ───────────────────────────────────────────────────

export type ScoreWithGap = AssessmentScore & {
  skill:          Pick<Skill, 'id' | 'name' | 'definition'>
  required_level: ProficiencyLevel | null
  gap:            number | null            // final_score - required_level
}

export type AssessmentDetail = Assessment & {
  employee: User
  scores:   ScoreWithGap[]
}

export type TeamMember = User & {
  assessment: Pick<Assessment, 'self_status' | 'manager_status'> | null
}

