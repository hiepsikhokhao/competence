import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logout } from '@/app/actions/auth'
import TabBar from '@/components/manager/TabBar'
import DashboardTab from '@/components/hr/DashboardTab'
import CycleTab from '@/components/hr/CycleTab'
import UsersTab from '@/components/hr/UsersTab'
import SkillsTab from '@/components/hr/SkillsTab'
import ExportTab from '@/components/hr/ExportTab'

export const metadata = { title: 'HR Admin — Competency Tool' }

const TABS = [
  { id: 'dashboard', label: 'Dashboard', href: '/hr?tab=dashboard' },
  { id: 'cycle',     label: 'Cycle',     href: '/hr?tab=cycle'     },
  { id: 'users',     label: 'Users',     href: '/hr?tab=users'     },
  { id: 'skills',    label: 'Skills',    href: '/hr?tab=skills'    },
  { id: 'export',    label: 'Export',    href: '/hr?tab=export'    },
]

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr') redirect('/login')

  const params = await searchParams
  const tab    = params.tab ?? 'dashboard'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HR Admin</h1>
            <p className="mt-1 text-sm text-gray-500">{profile.name}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>

        <TabBar tabs={TABS} currentTab={tab} />

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'cycle'     && <CycleTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'skills'    && <SkillsTab />}
        {tab === 'export'    && <ExportTab />}
      </div>
    </main>
  )
}
