import type { PolymarketMarket, Outcome } from '@/lib/types'

const BAR_COLORS = ['blue', 'red', 'accent', 'neutral', 'neutral']

function prepareOutcomes(outcomes: Outcome[]): { displayed: (Outcome & { colorClass: string })[]; otherProb: number } {
  const sorted = [...outcomes].sort((a, b) => b.probability - a.probability)
  const top = sorted.filter(o => o.probability >= 0.01).slice(0, 4)
  const others = sorted.filter(o => o.probability < 0.01).concat(
    sorted.filter(o => o.probability >= 0.01).slice(4)
  )
  const otherProb = others.reduce((s, o) => s + o.probability, 0)
  const displayed = top.map((o, i) => ({ ...o, colorClass: BAR_COLORS[i] ?? 'neutral' }))
  return { displayed, otherProb }
}

interface MarketCardProps {
  market: PolymarketMarket
}

export function MarketCard({ market }: MarketCardProps) {
  const { displayed, otherProb } = prepareOutcomes(market.outcomes)

  return (
    <div className="market-card">
      <div className="market-card-header">
        <div className="market-title">{market.question}</div>
        <div className="market-volume">
          {market.volume >= 1_000_000
            ? `$${(market.volume / 1_000_000).toFixed(1)}M`
            : `$${Math.round(market.volume / 1_000)}K`}
        </div>
      </div>
      <div className="market-outcomes">
        {displayed.map(outcome => (
          <div key={outcome.label} className="outcome-row">
            <span className="outcome-label">{outcome.label}</span>
            <div className="outcome-bar-track">
              <div
                className={`outcome-bar-fill ${outcome.colorClass}`}
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
    </div>
  )
}
