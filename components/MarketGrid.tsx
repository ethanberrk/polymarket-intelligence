import type { PolymarketMarket } from '@/lib/types'
import { MarketCard } from './MarketCard'

interface MarketGridProps {
  markets: PolymarketMarket[]
}

export function MarketGrid({ markets }: MarketGridProps) {
  if (markets.length === 0) return null
  return (
    <div className="market-grid">
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
