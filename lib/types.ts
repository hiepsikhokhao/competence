// ─── Scalar enums ─────────────────────────────────────────────────────────────

export type UserRole     = 'employee' | 'manager' | 'hr'
export type FunctionType = 'UA' | 'MKT' | 'LiveOps'
export type SelfStatus    = 'not_started' | 'draft' | 'submitted'
export type ManagerStatus = 'pending' | 'reviewed'
export type CycleStatus   = 'open' | 'closed'

/** Skill proficiency scale: 1 Basic → 2 Developing → 3 Proficient → 4 Expert */
export type ProficiencyLevel = 1 | 2 | 3 | 4

// ─── Table row types ──────────────────────────────────────────────────────────
// Must be `type` aliases (not `interface`) so they satisfy
// Record<string, unknown> — required by @supabase/postgrest-js GenericTable.Row.

export type User = {
  id:         string
  name:       string
  email:      string
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
}

export type SkillLevel = {
  id:          string
  skill_id:    string
  level:       ProficiencyLevel
  label:       string | null    // 'Basic' | 'Developing' | 'Proficient' | 'Expert'
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
  final_score:   ProficiencyLevel | null  // generated: coalesce(manager_score, self_score)
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

// ─── Database type map (for typed Supabase client) ────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row:           User
        Insert:        Omit<User, 'created_at'>
        Update:        Partial<Omit<User, 'id' | 'created_at'>>
        Relationships: []
      }
      skills: {
        Row:           Skill
        Insert:        Omit<Skill, 'id'>
        Update:        Partial<Omit<Skill, 'id'>>
        Relationships: []
      }
      skill_levels: {
        Row:           SkillLevel
        Insert:        Omit<SkillLevel, 'id'>
        Update:        Partial<Omit<SkillLevel, 'id'>>
        Relationships: []
      }
      skill_standards: {
        Row:           SkillStandard
        Insert:        SkillStandard
        Update:        Partial<SkillStandard>
        Relationships: []
      }
      cycle: {
        Row:    Cycle
        Insert: {
          name:      string
          status?:   CycleStatus
          opened_at?: string | null
          closed_at?: string | null
        }
        Update:        Partial<Omit<Cycle, 'id'>>
        Relationships: []
      }
      assessments: {
        Row:    Assessment
        // self_status, manager_status have DB defaults; timestamps default to null
        Insert: {
          cycle_id:            string
          employee_id:         string
          self_status?:         SelfStatus
          manager_status?:      ManagerStatus
          self_submitted_at?:   string | null
          manager_reviewed_at?: string | null
        }
        Update:        Partial<Omit<Assessment, 'id'>>
        Relationships: []
      }
      assessment_scores: {
        Row:    AssessmentScore
        // final_score is GENERATED ALWAYS — excluded from writes
        // scores are nullable (default null until rated)
        Insert: {
          assessment_id: string
          skill_id:      string
          self_score?:    ProficiencyLevel | null
          manager_score?: ProficiencyLevel | null
        }
        Update:        Partial<Omit<AssessmentScore, 'final_score'>>
        Relationships: []
      }
    }
    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role:      UserRole
      function_type:  FunctionType
      self_status:    SelfStatus
      manager_status: ManagerStatus
      cycle_status:   CycleStatus
    }
  }
}
