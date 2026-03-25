import type { PolymarketMarket } from '@/lib/types'

interface KPIRowProps {
  markets: PolymarketMarket[]
}

export function KPIRow({ markets }: KPIRowProps) {
  return (
    <div className="kpi-row">
      {markets.map(market => {
        const topOutcome = [...market.outcomes].sort((a, b) => b.probability - a.probability)[0]
        const pct = topOutcome ? Math.round(topOutcome.probability * 100) : 0
        return (
          <div key={market.id} className="kpi-card">
            <div className="kpi-value">{pct}%</div>
            <div className="kpi-label">{market.question}</div>
          </div>
        )
      })}
    </div>
  )
}
