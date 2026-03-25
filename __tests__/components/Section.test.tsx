import { render, screen } from '@testing-library/react'
import { Section } from '@/components/Section'
import type { CuratedSection, PolymarketMarket } from '@/lib/types'

const makeMarket = (slug: string): PolymarketMarket => ({
  id: slug, slug, question: `Question for ${slug}`, category: 'test',
  volume: 1000, volume24h: 100, endDate: '2026-12-31', active: true,
  outcomes: [{ label: 'Yes', probability: 0.6 }, { label: 'No', probability: 0.4 }],
})

const makeSection = (overrides: Partial<CuratedSection> = {}): CuratedSection => ({
  id: 'test', label: 'Test Section', intro: 'An intro', narrative: 'A narrative',
  slugs: [], markets: [makeMarket('m1'), makeMarket('m2'), makeMarket('m3'), makeMarket('m4')],
  ...overrides,
})

describe('Section', () => {
  it('renders callout with section narrative', () => {
    render(<Section section={makeSection()} />)
    expect(screen.getByText('A narrative')).toBeInTheDocument()
  })

  it('renders KPIRow when 4 or more markets', () => {
    render(<Section section={makeSection()} />)
    const kpiValues = document.querySelectorAll('.kpi-value')
    expect(kpiValues.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render KPIRow when fewer than 4 markets', () => {
    const section = makeSection({ markets: [makeMarket('m1'), makeMarket('m2')] })
    render(<Section section={section} />)
    const kpiValues = document.querySelectorAll('.kpi-value')
    expect(kpiValues.length).toBe(0)
  })

  it('renders Spotlight when spotlightSlug is set and found', () => {
    const section = makeSection({
      spotlightSlug: 'm1',
      spotlightDescription: 'Spotlight desc',
    })
    render(<Section section={section} />)
    expect(screen.getByText('Spotlight desc')).toBeInTheDocument()
  })

  it('renders nothing when markets is empty', () => {
    const { container } = render(<Section section={makeSection({ markets: [] })} />)
    expect(container.firstChild).toBeNull()
  })
})
