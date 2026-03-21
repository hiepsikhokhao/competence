import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in — Competency Tool' }

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#F4F6FB]">
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl px-8 py-10 bg-white"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        >
          {/* Logo / brand */}
          <div className="mb-8 text-center">
            <p className="text-2xl font-bold tracking-tight text-[#003087]">VNGGames</p>
            <p className="mt-1 text-sm text-[#6B7280]">Competency Assessment Tool</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  )
}
