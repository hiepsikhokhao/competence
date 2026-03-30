'use client'

import { useState, useTransition } from 'react'
import { updateUserManager, revertAssessment } from '@/app/actions/hr'
import type { FunctionType } from '@/lib/types'

type UserRow = {
  id:             string
  name:           string
  email:          string
  username:       string | null
  role:           string
  function:       string | null
  job_level:      string | null
  dept:           string | null
  manager_id:     string | null
  assessment_id:  string | null
  self_status:    string | null
  manager_status: string | null
}

type Manager = { id: string; name: string }

type Props = {
  users:    UserRow[]
  managers: Manager[]
}

const FUNCTIONS: (FunctionType | '')[] = ['', 'UA', 'MKT', 'LiveOps']
const ROLES = ['', 'employee', 'manager', 'hr']

export default function UsersTableClient({ users, managers }: Props) {
  const [filterFn,    setFilterFn]    = useState('')
  const [filterRole,  setFilterRole]  = useState('')
  const [search,      setSearch]      = useState('')
  const [savingId,    setSavingId]    = useState<string | null>(null)
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  const filtered = users.filter((u) => {
    if (filterFn   && u.function !== filterFn)  return false
    if (filterRole && u.role     !== filterRole) return false
    if (search) {
      const q = search.toLowerCase()
      const matchName  = u.name.toLowerCase().includes(q)
      const matchUser  = (u.username ?? '').toLowerCase().includes(q)
      const matchEmail = u.email.toLowerCase().includes(q)
      if (!matchName && !matchUser && !matchEmail) return false
    }
    return true
  })

  function handleManagerChange(userId: string, managerId: string) {
    const newManagerId = managerId || null
    setSavingId(userId)
    setErrors((prev) => { const n = { ...prev }; delete n[userId]; return n })
    startTransition(async () => {
      const res = await updateUserManager(userId, newManagerId)
      setSavingId(null)
      if (res?.error) setErrors((prev) => ({ ...prev, [userId]: res.error! }))
    })
  }

  function handleRevert(user: UserRow) {
    if (!user.assessment_id) return

    // Determine what can be reverted
    const canRevertManager = user.manager_status === 'reviewed'
    const canRevertSelf    = user.self_status === 'submitted' && !canRevertManager

    let stage: 'manager' | 'self'
    let confirmMsg: string

    if (canRevertManager) {
      stage = 'manager'
      confirmMsg = `Revert manager review for ${user.name}?\nThis will unlock the manager form (manager_status → pending).`
    } else if (canRevertSelf) {
      stage = 'self'
      confirmMsg = `Revert self-assessment for ${user.name}?\nThis will unlock the employee form (self_status → draft).`
    } else {
      return
    }

    if (!confirm(confirmMsg)) return

    setRevertingId(user.id)
    setErrors((prev) => { const n = { ...prev }; delete n[user.id + '-revert']; return n })
    startTransition(async () => {
      const res = await revertAssessment(user.assessment_id!, stage)
      setRevertingId(null)
      if (res?.error) setErrors((prev) => ({ ...prev, [user.id + '-revert']: res.error! }))
    })
  }

  function canRevert(u: UserRow): boolean {
    return u.assessment_id != null &&
      (u.manager_status === 'reviewed' || u.self_status === 'submitted')
  }

  return (
    <div className="space-y-3">
      {/* Filters + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username…"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0057D9] focus:outline-none min-w-[220px]"
        />
        <select
          value={filterFn}
          onChange={(e) => setFilterFn(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0057D9] focus:outline-none"
        >
          <option value="">All functions</option>
          {FUNCTIONS.filter(Boolean).map((fn) => (
            <option key={fn} value={fn}>{fn}</option>
          ))}
        </select>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0057D9] focus:outline-none"
        >
          <option value="">All roles</option>
          {ROLES.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Function</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Self</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    <div>{u.name}</div>
                    {u.username && (
                      <div className="text-[10px] text-gray-400">{u.username}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-600">{u.function ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.job_level ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.dept ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <select
                        defaultValue={u.manager_id ?? ''}
                        disabled={savingId === u.id}
                        onChange={(e) => handleManagerChange(u.id, e.target.value)}
                        className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-700 focus:border-[#0057D9] focus:outline-none disabled:opacity-50 min-w-[120px]"
                      >
                        <option value="">— none —</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {savingId === u.id && (
                        <span className="text-[10px] text-[#0057D9]">Saving…</span>
                      )}
                      {errors[u.id] && (
                        <span className="text-[10px] text-red-500">{errors[u.id]}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.self_status
                      ? <StatusPill s={u.self_status} type="self" />
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.manager_status
                      ? <StatusPill s={u.manager_status} type="manager" />
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {canRevert(u) && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleRevert(u)}
                          disabled={revertingId === u.id}
                          className="text-xs font-medium text-amber-600 hover:text-amber-800 disabled:opacity-50 whitespace-nowrap"
                        >
                          {revertingId === u.id ? 'Reverting…' : '↩ Revert'}
                        </button>
                        {errors[u.id + '-revert'] && (
                          <span className="text-[10px] text-red-500">{errors[u.id + '-revert']}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                    No users match the selected filters.
                  </td>
                </tr>
              )}
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
