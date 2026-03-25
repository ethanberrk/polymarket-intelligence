'use client'

import { useEffect, useState } from 'react'
import { LastUpdated } from './LastUpdated'

interface SiteHeaderProps {
  fetchedAt: string
}

export function SiteHeader({ fetchedAt }: SiteHeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const actual = document.documentElement.dataset.theme as 'light' | 'dark' | undefined
    setTheme(actual === 'dark' ? 'dark' : 'light')
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-left" />
        <div className="header-center">
          <a href="#" className="site-logo">By The Odds</a>
          <div className="site-tagline">Prediction Market Intelligence</div>
        </div>
        <div className="header-right">
          <LastUpdated fetchedAt={fetchedAt} />
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
