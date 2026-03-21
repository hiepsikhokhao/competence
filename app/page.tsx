// Root is handled entirely by proxy.ts:
// - unauthenticated → /login
// - authenticated   → /<role-path>
// This component is a fallback that should never render in practice.
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
