import type { CuratedSection } from '@/lib/types'
import { Callout } from './Callout'
import { KPIRow } from './KPIRow'
import { Spotlight } from './Spotlight'
import { MarketGrid } from './MarketGrid'

interface SectionProps {
  section: CuratedSection
}

export function Section({ section }: SectionProps) {
  if (section.markets.length === 0) return null

  const spotlightMarket = section.spotlightSlug
    ? section.markets.find(m => m.slug === section.spotlightSlug)
    : undefined

  const kpiMarkets = section.markets
    .filter(m => m.slug !== section.spotlightSlug)
    .slice(0, 4)

  return (
    <section className="section" id={section.id}>
      <div className="section-header">
        <h2 className="section-title">{section.label}</h2>
        {section.intro && <p className="section-intro">{section.intro}</p>}
      </div>

      <Callout title="Market Intelligence" body={section.narrative} />

      {kpiMarkets.length >= 4 && <KPIRow markets={kpiMarkets} />}

      {spotlightMarket && section.spotlightDescription && (
        <Spotlight market={spotlightMarket} description={section.spotlightDescription} />
      )}

      <MarketGrid markets={section.markets} />
    </section>
  )
}
