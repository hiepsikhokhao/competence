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
    supabase.from('assessment_scores').select('assessment_id, skill_id, self_score, manager_score, final_score'),
    supabase.from('skills').select('id, name, function'),
    supabase.from('skill_standards').select('skill_id, job_level, required_level'),
  ])

  const users      = usersRes.data   ?? []
  const asmts      = assRes.data     ?? []
  const scores     = scoresRes.data  ?? []
  const skills     = skillsRes.data  ?? []
  const standards  = stdRes.data     ?? []

  const userMap    = Object.fromEntries(users.map((u) => [u.id, u]))
  const assmtMap   = Object.fromEntries(asmts.map((a) => [a.id, a]))
  const skillMap   = Object.fromEntries(skills.map((s) => [s.id, s]))
  const stdMap     = Object.fromEntries(standards.map((s) => [`${s.skill_id}:${s.job_level}`, s.required_level]))

  // ── Sheet 1: Summary (one row per assessment) ──────────────────────────────
  const summaryRows = asmts.map((a) => {
    const emp = userMap[a.employee_id]
    return {
      Name:             emp?.name            ?? '',
      Email:            emp?.email           ?? '',
      Function:         emp?.function        ?? '',
      'Job Level':      emp?.job_level       ?? '',
      Department:       emp?.dept            ?? '',
      'Self Status':    a.self_status,
      'Manager Status': a.manager_status,
      'Submitted At':   a.self_submitted_at  ?? '',
      'Reviewed At':    a.manager_reviewed_at ?? '',
    }
  })

  // ── Sheet 2: Detailed scores (one row per assessment × skill) ──────────────
  const detailRows = scores.map((sc) => {
    const asmt    = assmtMap[sc.assessment_id]
    const emp     = asmt ? userMap[asmt.employee_id] : null
    const skill   = skillMap[sc.skill_id]
    const stdKey  = emp?.job_level ? `${sc.skill_id}:${emp.job_level}` : null
    const req     = stdKey ? (stdMap[stdKey] ?? null) : null
    const gap     = sc.final_score != null && req != null ? sc.final_score - req : null

    return {
      Name:             emp?.name      ?? '',
      Function:         emp?.function  ?? '',
      'Job Level':      emp?.job_level ?? '',
      Skill:            skill?.name    ?? '',
      'Self Score':     sc.self_score    ?? '',
      'Manager Score':  sc.manager_score ?? '',
      'Final Score':    sc.final_score   ?? '',
      'Required Level': req ?? '',
      Gap:              gap ?? '',
    }
  })

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
