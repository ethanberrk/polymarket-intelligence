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
      <div className="hero-edition">
        <span className="hero-edition-dot" />
        <span className="hero-edition-text">Live Markets</span>
      </div>
      <h1>What the odds say.</h1>
      <p className="hero-subtitle">
        Aggregated from the largest prediction markets — updated every 10 minutes.
        No opinion, no spin. Just the numbers.
      </p>
      <div className="hero-stats">
        <div className="hero-stat">
          <span className="hero-stat-value">{data.totalMarkets}</span>
          <span className="hero-stat-label">Active Markets</span>
        </div>
        <div className="hero-stat">
          <span className="hero-stat-value">{formatVolume(data.totalVolume)}</span>
          <span className="hero-stat-label">Total Volume</span>
        </div>
        <div className="hero-stat">
          <span className="hero-stat-value">{data.sections.filter(s => s.markets.length > 0).length}</span>
          <span className="hero-stat-label">Categories</span>
        </div>
      </div>
    </section>
  )
}
