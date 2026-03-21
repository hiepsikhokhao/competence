'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '@/app/actions/auth'

const initialState: LoginState = null

const inputCls =
  'w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-sm text-[#111827] ' +
  'placeholder-[#9CA3AF] shadow-sm outline-none transition-colors ' +
  'focus:border-[#0057D9] focus:ring-1 focus:ring-[#0057D9] ' +
  'disabled:bg-gray-50 disabled:text-gray-400'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#111827] mb-1">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputCls}
          placeholder="you@company.com"
          disabled={pending}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#111827] mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
          placeholder="••••••••"
          disabled={pending}
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#0057D9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#003087] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
