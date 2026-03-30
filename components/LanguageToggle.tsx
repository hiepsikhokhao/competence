'use client'

import { useLang } from '@/lib/hooks/useLang'
import type { Lang } from '@/lib/hooks/useLang'

export default function LanguageToggle() {
  const [lang, setLang] = useLang()

  return (
    <div className="flex items-center rounded-md border border-gray-200 bg-white text-xs font-medium shadow-sm overflow-hidden">
      {(['vi', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={[
            'px-3 py-1.5 transition-colors uppercase',
            lang === l
              ? 'bg-[#0057D9] text-white'
              : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
