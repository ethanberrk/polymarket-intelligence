import type { RawMarket, Headline } from '@/lib/types'
import { clusterMarkets } from '@/lib/cluster'

const makeMarket = (slug: string, tag: string, volume24hr = '100000', outcomePrices = '["0.6","0.4"]'): RawMarket => ({
  id: slug,
  slug,
  question: `Will ${slug} happen?`,
  outcomes: '["Yes","No"]',
  outcomePrices,
  volume: '1000000',
  volume24hr,
  endDate: '2026-12-31',
  active: true,
  closed: false,
  tags: [{ id: '1', label: tag }],
})

const makeHeadline = (title: string): Headline => ({
  title,
  source: 'Reuters',
  publishedAt: new Date().toISOString(),
})

function makeCategory(tag: string, count = 3): RawMarket[] {
  return Array.from({ length: count }, (_, i) =>
    makeMarket(`${tag.toLowerCase()}-market-${i}`, tag, String((count - i) * 10000))
  )
}

describe('clusterMarkets', () => {
  it('groups markets into sections by tag category', () => {
    const markets = [
      ...makeCategory('Politics'),
      ...makeCategory('Sports'),
    ]
    const sections = clusterMarkets(markets, [])
    const ids = sections.map(s => s.id)
    expect(ids).toContain('politics')
    expect(ids).toContain('sports')
  })

  it('orders sections by CATEGORY_ORDER (Politics before Sports)', () => {
    const markets = [...makeCategory('Sports'), ...makeCategory('Politics')]
    const sections = clusterMarkets(markets, [])
    const politicsIdx = sections.findIndex(s => s.id === 'politics')
    const sportsIdx = sections.findIndex(s => s.id === 'sports')
    expect(politicsIdx).toBeLessThan(sportsIdx)
  })

  it('sets spotlightSlug to the highest-volume market', () => {
    const markets = [
      makeMarket('low-vol', 'Politics', '5000'),
      makeMarket('high-vol', 'Politics', '99000'),
      makeMarket('mid-vol', 'Politics', '50000'),
    ]
    const [section] = clusterMarkets(markets, [])
    expect(section.spotlightSlug).toBe('high-vol')
  })

  it('caps slugs at 12 per section', () => {
    const markets = makeCategory('Crypto', 20)
    const [section] = clusterMarkets(markets, [])
    expect(section.slugs.length).toBeLessThanOrEqual(12)
  })

  it('excludes categories with fewer than 3 markets', () => {
    const markets = [
      makeMarket('solo', 'Sports', '100000'),
      makeMarket('duo', 'Sports', '90000'),
      ...makeCategory('Politics'),
    ]
    const sections = clusterMarkets(markets, [])
    expect(sections.find(s => s.id === 'sports')).toBeUndefined()
    expect(sections.find(s => s.id === 'politics')).toBeDefined()
  })

  it('maps tag aliases to canonical categories', () => {
    const markets = makeCategory('US Politics')
    const sections = clusterMarkets(markets, [])
    expect(sections[0].id).toBe('politics')
  })

  it('ignores markets with unmapped tags', () => {
    const markets = [
      ...makeCategory('Politics'),
      makeMarket('unknown', 'Astrology', '999999'),
    ]
    const sections = clusterMarkets(markets, [])
    expect(sections.length).toBe(1)
    expect(sections[0].slugs).not.toContain('unknown')
  })

  it('narrative leads with probability percentage for Yes markets', () => {
    const market = makeMarket('test', 'Politics', '100000', '["0.73","0.27"]')
    const sections = clusterMarkets([market, ...makeCategory('Politics').slice(0, 2)], [])
    const politics = sections.find(s => s.id === 'politics')!
    expect(politics.narrative).toMatch(/73%/)
  })

  it('throws when no sections can be built', () => {
    expect(() => clusterMarkets([], [])).toThrow('No sections')
  })

  it('accepts headlines parameter without error', () => {
    const markets = makeCategory('Politics')
    expect(() => clusterMarkets(markets, [makeHeadline('Big story')])).not.toThrow()
  })
})
