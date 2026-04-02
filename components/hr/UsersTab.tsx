import { prisma } from '@/lib/prisma'
import CsvImport from './CsvImport'
import UsersTableClient from './UsersTableClient'

export default async function UsersTab() {
  const [users, assessments] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.assessment.findMany({
      select: { id: true, employeeId: true, selfStatus: true, managerStatus: true },
    }),
  ])

  const asmtMap = Object.fromEntries(
    assessments.map((a) => [a.employeeId, a]),
  )

  const managers = users
    .filter((u) => u.role === 'manager' || u.role === 'hr')
    .map((u) => ({ id: u.id, name: u.name }))

  const tableUsers = users.map((u) => {
    const asmt = asmtMap[u.id]
    return {
      id:             u.id,
      name:           u.name,
      email:          u.email,
      username:       u.username ?? null,
      role:           u.role,
      function:       u.function ?? null,
      job_level:      u.jobLevel ?? null,
      dept:           u.dept ?? null,
      manager_id:     u.managerId ?? null,
      assessment_id:  asmt?.id ?? null,
      self_status:    asmt?.selfStatus    ?? null,
      manager_status: asmt?.managerStatus ?? null,
    }
  })

  return (
    <div className="space-y-4">
      <CsvImport />
      <UsersTableClient users={tableUsers} managers={managers} />
    </div>
  )
}
