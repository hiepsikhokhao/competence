import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in — Competency Tool' }

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Competency Assessment
          </h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-gray-200 px-6 py-8">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
