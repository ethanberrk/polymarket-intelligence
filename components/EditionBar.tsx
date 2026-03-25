import type { PageData } from '@/lib/types'

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B+`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M+`
  return `$${v.toLocaleString()}`
}

interface EditionBarProps {
  data: PageData
}

export function EditionBar({ data }: EditionBarProps) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="edition-bar">
      <span className="edition-bar-tagline">Prediction Market Intelligence</span>
      <span className="edition-bar-date">{date}</span>
      <span className="edition-bar-stats">
        {data.totalMarkets} active markets &middot; {formatVolume(data.totalVolume)} tracked
      </span>
    </div>
  )
}
