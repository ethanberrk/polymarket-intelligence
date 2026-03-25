import type { PolymarketMarket } from '@/lib/types'
import { MarketGrid } from './MarketGrid'

interface TrendingSectionProps {
  markets: PolymarketMarket[]
}

export function TrendingSection({ markets }: TrendingSectionProps) {
  if (markets.length === 0) return null
  return (
    <section className="section" id="trending">
      <div className="section-header">
        <div className="section-label">By Volume</div>
        <h2 className="section-title">Trending Markets</h2>
        <p className="section-intro">Top 10 US politics markets by 24-hour volume.</p>
      </div>
      <MarketGrid markets={markets} />
    </section>
  )
}
