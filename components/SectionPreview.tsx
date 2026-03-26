import type { CuratedSection } from '@/lib/types'
import { MarketCard } from './MarketCard'

interface SectionPreviewProps {
  section: CuratedSection
  onSeeAll: () => void
  isLead?: boolean
}

export function SectionPreview({ section, onSeeAll, isLead }: SectionPreviewProps) {
  const previewMarkets = section.markets
    .filter(m => m.slug !== section.spotlightSlug)
    .slice(0, isLead ? 4 : 3)

  if (previewMarkets.length === 0) return null

  return (
    <div className={`section-preview${isLead ? ' section-preview--lead' : ''}`} id={section.id}>
      <div className="section-preview-header">
        <div className="section-preview-meta">
          <div className="section-category-label">
            <span className="section-category-text">{section.id.toUpperCase()}</span>
          </div>
          <h2 className="section-title">{section.label}</h2>
          {section.intro && <p className="section-intro">{section.intro}</p>}
        </div>
        <button className="see-all-btn" onClick={onSeeAll}>
          All {section.markets.length} markets →
        </button>
      </div>
      <div className="market-grid">
        {previewMarkets.map(market => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  )
}
