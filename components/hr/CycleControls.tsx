'use client'

import { useState, useTransition } from 'react'
import { createCycle, openCycle, closeCycle } from '@/app/actions/hr'

type Props = {
  cycleId: string | null
  status:  string | null
}

export default function CycleControls({ cycleId, status }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error,     setError]        = useState<string | null>(null)
  const [newName,   setNewName]      = useState('POC 2026')

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      {!cycleId ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Cycle name"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0057D9] focus:outline-none"
          />
          <button
            onClick={() => run(() => createCycle(newName))}
            disabled={isPending || !newName.trim()}
            className="rounded-md bg-[#0057D9] px-4 py-2 text-sm font-medium text-white hover:bg-[#003087] disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create Cycle'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {status === 'closed' && (
            <button
              onClick={() => run(() => openCycle(cycleId))}
              disabled={isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {isPending ? 'Opening…' : 'Open Cycle'}
            </button>
          )}
          {status === 'open' && (
            <button
              onClick={() => run(() => closeCycle(cycleId))}
              disabled={isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {isPending ? 'Closing…' : 'Close Cycle'}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
