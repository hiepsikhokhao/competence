import Link from 'next/link'
import type { TeamMember } from '@/lib/types'

type Props = { members: TeamMember[] }

function SelfStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_started: { label: 'Not started', cls: 'bg-gray-100 text-gray-600' },
    draft:       { label: 'Draft',       cls: 'bg-amber-50 text-amber-700' },
    submitted:   { label: 'Submitted',   cls: 'bg-green-50 text-green-700' },
  }
  const { label, cls } = map[status] ?? map.not_started
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function ManagerStatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
        Pending
      </span>
    )
  }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-700">
      Reviewed
    </span>
  )
}

export default function TeamTable({ members }: Props) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-12">No team members found.</p>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Level</th>
            <th className="px-6 py-3">Self-assessment</th>
            <th className="px-6 py-3">Review</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{member.name}</td>
              <td className="px-6 py-4 text-gray-500">{member.job_level ?? '—'}</td>
              <td className="px-6 py-4">
                <SelfStatusBadge status={member.assessment?.self_status ?? 'not_started'} />
              </td>
              <td className="px-6 py-4">
                <ManagerStatusBadge
                  status={member.assessment ? member.assessment.manager_status : null}
                />
              </td>
              <td className="px-6 py-4 text-right">
                {member.assessment?.self_status === 'submitted' && (
                  <Link
                    href={`/manager?tab=team&employee=${member.id}`}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Review →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
