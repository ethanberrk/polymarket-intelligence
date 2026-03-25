'use client'

import { useState } from 'react'
import type { CuratedSection, PolymarketMarket } from '@/lib/types'
import { Section } from './Section'
import { TrendingSection } from './TrendingSection'
import { SectionPreview } from './SectionPreview'

interface HomeContentProps {
  sections: CuratedSection[]
  trending: PolymarketMarket[]
}

export function HomeContent({ sections, trending }: HomeContentProps) {
  const [active, setActive] = useState<string>('all')

  const activeSections = sections.filter(s => s.markets.length > 0)
  const selectedSection = activeSections.find(s => s.id === active)

  return (
    <>
      <nav className="category-nav" aria-label="Category filter">
        <button
          className={`category-tab${active === 'all' ? ' active' : ''}`}
          onClick={() => setActive('all')}
        >
          Home
        </button>
        {activeSections.map(s => (
          <button
            key={s.id}
            className={`category-tab${active === s.id ? ' active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button
          className={`category-tab${active === 'trending' ? ' active' : ''}`}
          onClick={() => setActive('trending')}
        >
          Trending
        </button>
      </nav>

      <div className="page-wrapper">
        {active === 'all' && (
          <>
            {activeSections.map(s => (
              <SectionPreview
                key={s.id}
                section={s}
                onSeeAll={() => setActive(s.id)}
              />
            ))}
          </>
        )}

        {selectedSection && (
          <Section section={selectedSection} />
        )}

        {active === 'trending' && (
          <TrendingSection markets={trending} />
        )}
      </div>
    </>
  )
}
