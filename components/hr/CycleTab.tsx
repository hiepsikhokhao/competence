import { createServerSupabaseClient } from '@/lib/supabase'
import CycleControls from './CycleControls'

export default async function CycleTab() {
  const supabase = await createServerSupabaseClient()
  const { data: cycles } = await supabase
    .from('cycle')
    .select('id, name, status, opened_at, closed_at')
  const cycle = cycles?.[0] ?? null

  const fmt = (ts: string | null) =>
    ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {cycle ? (
          <>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">{cycle.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {fmt(cycle.opened_at) ? `Opened ${fmt(cycle.opened_at)}` : 'Not yet opened'}
                  {fmt(cycle.closed_at) && ` · Closed ${fmt(cycle.closed_at)}`}
                </p>
              </div>
              <StatusBadge status={cycle.status} />
            </div>
            <CycleControls cycleId={cycle.id} status={cycle.status} />
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">No assessment cycle exists yet.</p>
            <CycleControls cycleId={null} status={null} />
          </>
        )}
      </div>

      {cycle && (
        <p className="text-xs text-gray-400">
          Opening the cycle allows employees to start self-assessments.
          Closing it locks all in-progress forms.
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'open'
    ? 'bg-green-50 text-green-700'
    : 'bg-gray-100 text-gray-600'
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  )
}
