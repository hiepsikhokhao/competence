'use client'

import { useState, useTransition } from 'react'
import { importUsers, type CsvUserRow, type ImportResult } from '@/app/actions/hr'

export default function CsvImport() {
  const [isPending, startTransition] = useTransition()
  const [result,     setResult]      = useState<ImportResult | null>(null)
  const [parseError, setParseError]  = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCsv(ev.target?.result as string)
        startTransition(async () => {
          const res = await importUsers(rows)
          setResult(res)
        })
      } catch (err) {
        setParseError((err as Error).message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''   // allow re-importing same file
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">Import Users from CSV</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Columns: <code className="font-mono">name, email, role, dept, function, job_level, manager_email</code>
            {' '}— updates existing accounts only
          </p>
        </div>
        <label
          className={[
            'ml-auto cursor-pointer whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50',
            isPending ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          {isPending ? 'Importing…' : 'Choose CSV…'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFile}
            disabled={isPending}
          />
        </label>
      </div>

      {parseError && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{parseError}</p>
      )}

      {result && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs space-y-1">
          <p className="font-medium text-gray-700">
            ✓ {result.updated} updated · {result.skipped} skipped
          </p>
          {result.errors.slice(0, 8).map((err, i) => (
            <p key={i} className="text-amber-700">{err}</p>
          ))}
          {result.errors.length > 8 && (
            <p className="text-gray-400">…and {result.errors.length - 8} more warnings</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── CSV parser (handles comma-delimited, unquoted values) ─────────────────────
function parseCsv(text: string): CsvUserRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one data row')

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: CsvUserRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map((v) => v.trim())
    const row: CsvUserRow = { name: '', email: '' }

    headers.forEach((h, idx) => {
      const v = values[idx] ?? ''
      if      (h === 'name')          row.name          = v
      else if (h === 'email')         row.email         = v
      else if (h === 'role')          row.role          = v
      else if (h === 'dept')          row.dept          = v
      else if (h === 'function')      row.function      = v
      else if (h === 'job_level')     row.job_level     = v
      else if (h === 'manager_email') row.manager_email = v
    })

    if (!row.email) continue
    rows.push(row)
  }

  if (rows.length === 0) throw new Error('No valid rows found in CSV')
  return rows
}
