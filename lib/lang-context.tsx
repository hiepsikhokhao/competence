'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'vi' | 'en'

const STORAGE_KEY = 'lang'
const DEFAULT: Lang = 'vi'

type ContextValue = { lang: Lang; setLang: (l: Lang) => void }

const LangContext = createContext<ContextValue>({ lang: DEFAULT, setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'vi') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang(): [Lang, (l: Lang) => void] {
  const { lang, setLang } = useContext(LangContext)
  return [lang, setLang]
}
