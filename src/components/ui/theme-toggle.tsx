"use client"
import React, { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, systemTheme } = useTheme()
  const current = theme === 'system' ? systemTheme : theme
  const [mounted, setMounted] = useState(false)

  // Evitar mismatch de hidratação aguardando o tema estar resolvido no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = current === 'dark' ? 'light' : 'dark'
    setTheme(next || 'light')
  }

  if (!mounted) {
    // Placeholder estático para manter layout sem causar mismatch
    return (
      <button
        className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm gap-2 w-[110px] h-9 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    )
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm gap-2"
      aria-label={`Alternar tema (${current === 'dark' ? 'claro' : 'escuro'})`}
    >
      {current === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{current === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  )
}
