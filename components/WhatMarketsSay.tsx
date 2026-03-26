import type { CuratedSection } from '@/lib/types'
import { getSectionInsight } from '@/lib/insights'

interface WhatMarketsSayProps {
  sections: CuratedSection[]
  onSectionClick: (id: string) => void
}

export function WhatMarketsSay({ sections, onSectionClick }: WhatMarketsSayProps) {
  const items = sections
    .filter(s => s.markets.length > 0)
    .map(s => ({ section: s, insight: getSectionInsight(s) }))
    .filter(({ insight }) => insight !== null)

  if (items.length === 0) return null

  return (
    <aside className="wtms-sidebar">
      <div className="wtms-header">
        <span className="wtms-live-dot" />
        <h2 className="wtms-title">What the Markets Say</h2>
      </div>

      <ol className="wtms-list">
        {items.map(({ section, insight }, i) => (
          <li key={section.id} className="wtms-item">
            <span className="wtms-num">{i + 1}</span>
            <div className="wtms-content">
              <button
                className="wtms-category"
                onClick={() => onSectionClick(section.id)}
              >
                {section.label}
              </button>
              <div className="wtms-signal">
                <span className="wtms-pct">{insight!.signal.pct}%</span>
                <span className="wtms-signal-label">{insight!.signal.label}</span>
              </div>
              <p className="wtms-question">{insight!.question}</p>
              <p className="wtms-narrative">{insight!.narrative}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}
