import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  if ((session.user as any).role !== 'hr') return new Response('Forbidden', { status: 403 })

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const [users, asmts, scoresRaw, skillsRaw, standards] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, function: true, jobLevel: true, dept: true },
      orderBy: { name: 'asc' },
    }),
    prisma.assessment.findMany({
      select: { id: true, employeeId: true, selfStatus: true, managerStatus: true, selfSubmittedAt: true, managerReviewedAt: true },
    }),
    prisma.assessmentScore.findMany({
      select: { assessmentId: true, skillId: true, selfScore: true, managerScore: true, finalScore: true, evidence: true },
    }),
    prisma.skill.findMany({
      select: { id: true, name: true, function: true, importance: true },
    }),
    prisma.skillStandard.findMany({
      select: { skillId: true, jobLevel: true, requiredLevel: true },
    }),
  ])

  const scores = scoresRaw as { assessmentId: string; skillId: string; selfScore: number | null; managerScore: number | null; finalScore: number | null; evidence: string | null }[]
  const skills = skillsRaw as { id: string; name: string; function: string; importance: number | null }[]

  const assmtByEmployee = Object.fromEntries(asmts.map((a) => [a.employeeId, a]))
  const skillMap  = Object.fromEntries(skills.map((s) => [s.id, s]))
  const stdMap    = Object.fromEntries(standards.map((s) => [`${s.skillId}:${s.jobLevel}`, s.requiredLevel]))

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryRows = users.filter((u) => u.role === 'employee').map((u) => {
    const asmt = assmtByEmployee[u.id]
    return {
      Name:             u.name,
      Email:            u.email,
      Function:         u.function        ?? '',
      'Job Level':      u.jobLevel        ?? '',
      Department:       u.dept            ?? '',
      'Self Status':    asmt?.selfStatus    ?? 'not_started',
      'Manager Status': asmt?.managerStatus ?? '',
      'Submitted At':   asmt?.selfSubmittedAt?.toISOString()   ?? '',
      'Reviewed At':    asmt?.managerReviewedAt?.toISOString() ?? '',
    }
  })

  // ── Sheet 2: Detailed scores ──────────────────────────────────────────────
  const detailRows: Record<string, unknown>[] = []

  for (const u of users.filter((u) => u.role === 'employee')) {
    const asmt    = assmtByEmployee[u.id]
    const fnSkills = skills.filter((s) => s.function === u.function)

    if (fnSkills.length === 0) {
      detailRows.push({
        Name:             u.name,
        Email:            u.email,
        Function:         u.function  ?? '',
        'Job Level':      u.jobLevel  ?? '',
        Department:       u.dept      ?? '',
        'Self Status':    asmt?.selfStatus    ?? 'not_started',
        'Manager Status': asmt?.managerStatus ?? '',
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
        ? scores.find((r) => r.assessmentId === asmt.id && r.skillId === skill.id)
        : null
      const stdKey    = u.jobLevel ? `${skill.id}:${u.jobLevel}` : null
      const req       = stdKey ? (stdMap[stdKey] ?? null) : null
      const imp       = skill.importance ?? null
      const selfScore = sc?.selfScore    ?? null
      const mgScore   = sc?.managerScore ?? null
      const final     = sc?.finalScore   ?? null
      const stdScore  = req != null && imp != null ? req * imp : null
      const actScore  = final != null && imp != null ? final * imp : null
      const gap       = actScore != null && stdScore != null ? actScore - stdScore : null

      detailRows.push({
        Name:             u.name,
        Email:            u.email,
        Function:         u.function  ?? '',
        'Job Level':      u.jobLevel  ?? '',
        Department:       u.dept      ?? '',
        'Self Status':    asmt?.selfStatus    ?? 'not_started',
        'Manager Status': asmt?.managerStatus ?? '',
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
