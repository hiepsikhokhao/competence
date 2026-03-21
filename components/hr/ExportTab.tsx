'use client'

export default function ExportTab() {
  return (
    <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Export Report</h2>
      <p className="mt-1 text-sm text-gray-500">
        Download a full Excel workbook with two sheets:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-500">
        <li>· <span className="font-medium text-gray-700">Summary</span> — one row per assessment with statuses</li>
        <li>· <span className="font-medium text-gray-700">Scores</span> — one row per skill × employee with gap</li>
      </ul>
      <a
        href="/api/export"
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
      >
        Download Excel Report
      </a>
    </div>
  )
}
