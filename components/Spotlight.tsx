import type { PolymarketMarket } from '@/lib/types'
import { MarketCard } from './MarketCard'

interface SpotlightProps {
  market: PolymarketMarket
  description: string
}

export function Spotlight({ market, description }: SpotlightProps) {
  return (
    <div className="spotlight">
      <h3 className="spotlight-title">{market.question}</h3>
      <p className="spotlight-desc">{description}</p>
      <MarketCard market={market} />
    </div>
  )
}
