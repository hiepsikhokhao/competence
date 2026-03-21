import { createServerSupabaseClient } from '@/lib/supabase'
import CsvImport from './CsvImport'
import UsersTableClient from './UsersTableClient'

export default async function UsersTab() {
  const supabase = await createServerSupabaseClient()

  const [usersRes, assRes] = await Promise.all([
    supabase.from('users').select('id, name, email, role, function, job_level, dept, manager_id').order('name'),
    supabase.from('assessments').select('employee_id, self_status, manager_status'),
  ])

  const users   = usersRes.data ?? []
  const asmtMap = Object.fromEntries(
    (assRes.data ?? []).map((a) => [a.employee_id, a])
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
      role:           u.role,
      function:       u.function ?? null,
      job_level:      u.job_level ?? null,
      dept:           u.dept ?? null,
      manager_id:     u.manager_id ?? null,
      self_status:    asmt?.self_status    ?? null,
      manager_status: asmt?.manager_status ?? null,
    }
  })

  return (
    <div className="space-y-4">
      <CsvImport />
      <UsersTableClient users={tableUsers} managers={managers} />
    </div>
  )
}
