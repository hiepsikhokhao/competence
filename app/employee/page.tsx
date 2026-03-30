import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logout } from '@/app/actions/auth'
import AssessmentTabContent from '@/components/assessment/AssessmentTabContent'
import LanguageToggle from '@/components/LanguageToggle'
import { LangProvider } from '@/lib/lang-context'
import type { FunctionType } from '@/lib/types'

export const metadata = { title: 'My Assessment — Competency Tool' }

export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role, function, job_level')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'employee') redirect('/login')

  const params      = await searchParams
  const activeTab   = params.tab === 'result' ? 'result' : 'assessment'

  const userFunction = profile.function as FunctionType | null
  const userJobLevel = profile.job_level

  return (
    <main className="min-h-screen bg-[#F4F6FB]">
      <LangProvider>
      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#003087]">Self-Assessment</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#6B7280]">
              <span>{profile.name}</span>
              {userFunction && (
                <>
                  <span aria-hidden>·</span>
                  <span>{userFunction}</span>
                </>
              )}
              {userJobLevel && (
                <>
                  <span aria-hidden>·</span>
                  <span>Level {userJobLevel}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <AssessmentTabContent
          userId={user.id}
          userFunction={userFunction}
          userJobLevel={userJobLevel}
          baseUrl="/employee"
          activeTab={activeTab}
        />
      </div>
      </LangProvider>
    </main>
  )
}
