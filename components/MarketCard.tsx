import type { PolymarketMarket, Outcome } from '@/lib/types'
import { polymarketUrl } from '@/lib/polymarket'

function prepareOutcomes(outcomes: Outcome[]): { displayed: Outcome[]; otherProb: number } {
  const sorted = [...outcomes].sort((a, b) => b.probability - a.probability)
  const top = sorted.filter(o => o.probability >= 0.01).slice(0, 4)
  const others = sorted.filter(o => o.probability < 0.01).concat(
    sorted.filter(o => o.probability >= 0.01).slice(4)
  )
  const otherProb = others.reduce((s, o) => s + o.probability, 0)
  return { displayed: top, otherProb }
}

interface MarketCardProps {
  market: PolymarketMarket
}

export function MarketCard({ market }: MarketCardProps) {
  const { displayed, otherProb } = prepareOutcomes(market.outcomes)

  return (
    <a
      href={polymarketUrl(market.slug)}
      target="_blank"
      rel="noopener noreferrer"
      className="market-card"
    >
      <div className="market-card-header">
        <div className="market-title">{market.question}</div>
        <div className="market-volume">${(market.volume / 1_000_000).toFixed(1)}M</div>
      </div>
      <div className="market-outcomes">
        {displayed.map(outcome => (
          <div key={outcome.label} className="outcome-row">
            <span className="outcome-label">{outcome.label}</span>
            <div className="outcome-bar-track">
              <div
                className="outcome-bar-fill"
                style={{ width: `${Math.round(outcome.probability * 100)}%` }}
              >
                <span className="outcome-pct">{Math.round(outcome.probability * 100)}%</span>
              </div>
            </div>
          </div>
        ))}
        {otherProb > 0.03 && (
          <div className="outcome-row">
            <span className="outcome-label">Other</span>
            <div className="outcome-bar-track">
              <div
                className="outcome-bar-fill"
                style={{ width: `${Math.round(otherProb * 100)}%` }}
              >
                <span className="outcome-pct">{Math.round(otherProb * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
