'use client'

import { useEffect, useState } from 'react'

interface LastUpdatedProps {
  fetchedAt: string
}

function getRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin === 1) return '1 min ago'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 hour ago'
  return `${diffHr} hours ago`
}

export function LastUpdated({ fetchedAt }: LastUpdatedProps) {
  const [label, setLabel] = useState('Recently updated')  // SSR-safe initial value

  useEffect(() => {
    setLabel(getRelativeTime(fetchedAt))
    const interval = setInterval(() => setLabel(getRelativeTime(fetchedAt)), 60_000)
    return () => clearInterval(interval)
  }, [fetchedAt])

  return <span className="last-updated">{label}</span>
}
