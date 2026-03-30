import { createServerSupabaseClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr') return new Response('Forbidden', { status: 403 })

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const [usersRes, assRes, scoresRes, skillsRes, stdRes] = await Promise.all([
    supabase.from('users').select('id, name, email, role, function, job_level, dept').order('name'),
    supabase.from('assessments').select('id, employee_id, self_status, manager_status, self_submitted_at, manager_reviewed_at'),
    supabase.from('assessment_scores').select('assessment_id, skill_id, self_score, manager_score, final_score, evidence'),
    supabase.from('skills').select('id, name, function, importance'),
    supabase.from('skill_standards').select('skill_id, job_level, required_level'),
  ])

  const users      = usersRes.data   ?? []
  const asmts      = assRes.data     ?? []
  const scores     = (scoresRes.data  ?? []) as { assessment_id: string; skill_id: string; self_score: number | null; manager_score: number | null; final_score: number | null; evidence: string | null }[]
  const skills     = (skillsRes.data ?? []) as { id: string; name: string; function: string; importance: number | null }[]
  const standards  = stdRes.data     ?? []

  const userMap   = Object.fromEntries(users.map((u) => [u.id, u]))
  const assmtByEmployee = Object.fromEntries(asmts.map((a) => [a.employee_id, a]))
  const assmtById = Object.fromEntries(asmts.map((a) => [a.id, a]))
  const skillMap  = Object.fromEntries(skills.map((s) => [s.id, s]))
  const stdMap    = Object.fromEntries(standards.map((s) => [`${s.skill_id}:${s.job_level}`, s.required_level]))

  // ── Sheet 1: Summary — ALL employees regardless of status ──────────────────
  const summaryRows = users.filter((u) => u.role === 'employee').map((u) => {
    const asmt = assmtByEmployee[u.id]
    return {
      Name:             u.name,
      Email:            u.email,
      Function:         u.function        ?? '',
      'Job Level':      u.job_level       ?? '',
      Department:       u.dept            ?? '',
      'Self Status':    asmt?.self_status    ?? 'not_started',
      'Manager Status': asmt?.manager_status ?? '',
      'Submitted At':   asmt?.self_submitted_at   ?? '',
      'Reviewed At':    asmt?.manager_reviewed_at ?? '',
    }
  })

  // ── Sheet 2: Detailed scores — ALL employees, ALL skills ──────────────────
  // For employees with no scores, still include rows with empty score columns
  const detailRows: Record<string, unknown>[] = []

  for (const u of users.filter((u) => u.role === 'employee')) {
    const asmt    = assmtByEmployee[u.id]
    const fnSkills = skills.filter((s) => s.function === u.function)

    if (fnSkills.length === 0) {
      // No skills for this function — add a placeholder row
      detailRows.push({
        Name:             u.name,
        Email:            u.email,
        Function:         u.function  ?? '',
        'Job Level':      u.job_level ?? '',
        Department:       u.dept      ?? '',
        'Self Status':    asmt?.self_status    ?? 'not_started',
        'Manager Status': asmt?.manager_status ?? '',
        Skill:            '',
        'Self Score':     '',
        'Manager Score':  '',
        'Final Score':    '',
        Evidence:         '',
        Standard:         '',
        Importance:       '',
        'Standard Score': '',
        'Actual Score':   '',
        Gap:              '',
      })
      continue
    }

    for (const skill of fnSkills) {
      const sc = asmt
        ? scores.find((r) => r.assessment_id === asmt.id && r.skill_id === skill.id)
        : null
      const stdKey    = u.job_level ? `${skill.id}:${u.job_level}` : null
      const req       = stdKey ? (stdMap[stdKey] ?? null) : null
      const imp       = skill.importance ?? null
      const selfScore = sc?.self_score    ?? null
      const mgScore   = sc?.manager_score ?? null
      const final     = sc?.final_score   ?? null
      const stdScore  = req != null && imp != null ? req * imp : null
      const actScore  = final != null && imp != null ? final * imp : null
      const gap       = actScore != null && stdScore != null ? actScore - stdScore : null

      detailRows.push({
        Name:             u.name,
        Email:            u.email,
        Function:         u.function  ?? '',
        'Job Level':      u.job_level ?? '',
        Department:       u.dept      ?? '',
        'Self Status':    asmt?.self_status    ?? 'not_started',
        'Manager Status': asmt?.manager_status ?? '',
        Skill:            skill.name,
        'Self Score':     selfScore ?? '',
        'Manager Score':  mgScore   ?? '',
        'Final Score':    final     ?? '',
        Evidence:         sc?.evidence ?? '',
        Standard:         req       ?? '',
        Importance:       imp       ?? '',
        'Standard Score': stdScore  ?? '',
        'Actual Score':   actScore  ?? '',
        Gap:              gap       ?? '',
      })
    }
  }

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows),  'Scores')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="competency-report.xlsx"',
    },
  })
}
