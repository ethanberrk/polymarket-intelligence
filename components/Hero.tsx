import type { PageData } from '@/lib/types'

interface HeroProps {
  data: PageData
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B+`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M+`
  return `$${v.toLocaleString()}`
}

export function Hero({ data }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-label">Polymarket Prediction Markets</div>
      <h1>State of US Politics</h1>
      <p className="hero-subtitle">
        What prediction markets are pricing in across elections, foreign policy, legislation,
        and executive power — based on {data.totalMarkets} active Polymarket contracts.
      </p>
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-value">{data.totalMarkets}</div>
          <div className="hero-stat-label">Active Markets</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">{formatVolume(data.totalVolume)}</div>
          <div className="hero-stat-label">Total Volume</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">{data.sections.filter(s => s.markets.length > 0).length}</div>
          <div className="hero-stat-label">Categories</div>
        </div>
      </div>
    </section>
  )
}
