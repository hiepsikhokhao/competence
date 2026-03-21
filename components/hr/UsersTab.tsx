import { createServerSupabaseClient } from '@/lib/supabase'
import CsvImport from './CsvImport'

export default async function UsersTab() {
  const supabase = await createServerSupabaseClient()

  const [usersRes, assRes] = await Promise.all([
    supabase.from('users').select('id, name, email, role, function, job_level, dept, manager_id').order('name'),
    supabase.from('assessments').select('employee_id, self_status, manager_status'),
  ])

  const users      = usersRes.data ?? []
  const asmtMap    = Object.fromEntries(
    (assRes.data ?? []).map((a) => [a.employee_id, a])
  )
  const nameMap    = Object.fromEntries(users.map((u) => [u.id, u.name]))

  return (
    <div className="space-y-4">
      <CsvImport />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {users.length} users
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Function</th>
                <th className="px-6 py-3">Level</th>
                <th className="px-6 py-3">Dept</th>
                <th className="px-6 py-3">Manager</th>
                <th className="px-6 py-3">Self</th>
                <th className="px-6 py-3">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const asmt = asmtMap[u.id]
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{u.email}</td>
                    <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-6 py-3 text-gray-600">{u.function ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{u.job_level ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{u.dept ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {u.manager_id ? (nameMap[u.manager_id] ?? '—') : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {asmt
                        ? <StatusPill s={asmt.self_status} type="self" />
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      {asmt
                        ? <StatusPill s={asmt.manager_status} type="manager" />
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cls: Record<string, string> = {
    hr:       'bg-purple-50 text-purple-700',
    manager:  'bg-blue-50   text-blue-700',
    employee: 'bg-gray-100  text-gray-600',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls[role] ?? cls.employee}`}>
      {role}
    </span>
  )
}

function StatusPill({ s, type }: { s: string; type: 'self' | 'manager' }) {
  const selfCls: Record<string, string> = {
    not_started: 'bg-gray-100  text-gray-500',
    draft:       'bg-amber-50  text-amber-700',
    submitted:   'bg-green-50  text-green-700',
  }
  const mgCls: Record<string, string> = {
    pending:  'bg-gray-100  text-gray-500',
    reviewed: 'bg-green-50  text-green-700',
  }
  const cls = type === 'self' ? (selfCls[s] ?? selfCls.not_started) : (mgCls[s] ?? mgCls.pending)
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {s.replace('_', ' ')}
    </span>
  )
}
