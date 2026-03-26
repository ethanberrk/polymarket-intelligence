'use client'

import { useState } from 'react'
import type { CuratedSection, PolymarketMarket } from '@/lib/types'
import { Section } from './Section'
import { TrendingSection } from './TrendingSection'
import { SectionPreview } from './SectionPreview'
import { WhatMarketsSay } from './WhatMarketsSay'

interface HomeContentProps {
  sections: CuratedSection[]
  trending: PolymarketMarket[]
}

export function HomeContent({ sections, trending }: HomeContentProps) {
  const [active, setActive] = useState<string>('all')

  const activeSections = sections.filter(s => s.markets.length > 0)
  const selectedSection = activeSections.find(s => s.id === active)
  const isHome = active === 'all'

  return (
    <>
      <nav className="category-nav" aria-label="Category filter">
        <button
          className={`category-tab${isHome ? ' active' : ''}`}
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

      {isHome ? (
        <div className="home-layout page-wrapper">
          <WhatMarketsSay sections={sections} onSectionClick={setActive} />
          <div className="home-main">
            {activeSections.map((s, i) => (
              <SectionPreview
                key={s.id}
                section={s}
                onSeeAll={() => setActive(s.id)}
                isLead={i === 0}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="page-wrapper">
          {selectedSection && <Section section={selectedSection} />}
          {active === 'trending' && <TrendingSection markets={trending} />}
        </div>
      )}
    </>
  )
}
