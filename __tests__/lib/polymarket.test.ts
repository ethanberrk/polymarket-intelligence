import { fetchMarketsBySlug, fetchTrendingMarkets, polymarketUrl, fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
import type { RawMarket } from '@/lib/types'

const mockMarket = {
  id: '1', slug: 'test-market', question: 'Q?',
  outcomes: '["Yes","No"]', outcomePrices: '["0.6","0.4"]',
  volume: '1000', volume24hr: '100', endDate: '2026-12-31',
  active: true, closed: false, tags: [],
}

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('polymarketUrl', () => {
  it('returns correct Polymarket event URL', () => {
    expect(polymarketUrl('my-market-slug')).toBe('https://polymarket.com/event/my-market-slug')
  })
})

describe('fetchMarketsBySlug', () => {
  it('returns empty array for empty slug list', async () => {
    const result = await fetchMarketsBySlug([])
    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches each slug and returns flattened results', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [mockMarket],
    })
    const result = await fetchMarketsBySlug(['test-market'])
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('test-market')
  })

  it('throws when API returns non-ok status', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })
    await expect(fetchMarketsBySlug(['test-market'])).rejects.toThrow('Gamma API error')
  })
})

describe('fetchTrendingMarkets', () => {
  it('fetches and returns trending markets array', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [mockMarket],
    })
    const result = await fetchTrendingMarkets()
    expect(result).toHaveLength(1)
    const callUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(callUrl).toContain('tag_id=')
    expect(callUrl).toContain('active=true')
  })

  it('throws when trending API returns non-ok status', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchTrendingMarkets()).rejects.toThrow('Gamma API trending fetch failed')
  })
})

const makeMarket = (overrides: Partial<RawMarket> = {}): RawMarket => ({
  id: '1',
  slug: 'test',
  question: 'Q?',
  outcomes: '["Yes","No"]',
  outcomePrices: '["0.5","0.5"]',
  volume: '10000',
  volume24hr: '10000',
  endDate: '2026-12-31',
  active: true,
  closed: false,
  tags: [{ id: '1', label: 'Politics' }],
  ...overrides,
})

describe('fetchAllMarkets', () => {
  it('fetches and returns all active markets', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [makeMarket()],
    })
    const result = await fetchAllMarkets()
    expect(result).toHaveLength(1)
    const url = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('active=true')
    expect(url).toContain('limit=500')
  })

  it('throws when API returns non-ok status', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchAllMarkets()).rejects.toThrow('fetchAllMarkets failed')
  })

  it('returns empty array when API returns non-array', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => null })
    const result = await fetchAllMarkets()
    expect(result).toEqual([])
  })
})

describe('filterAndCapMarkets', () => {
  it('drops markets below the volume24h floor', () => {
    const markets = [
      makeMarket({ slug: 'liquid', volume24hr: '10000' }),
      makeMarket({ slug: 'dead', volume24hr: '100' }),
    ]
    const result = filterAndCapMarkets(markets)
    expect(result.map(m => m.slug)).toContain('liquid')
    expect(result.map(m => m.slug)).not.toContain('dead')
  })

  it('drops inactive and closed markets', () => {
    const markets = [
      makeMarket({ slug: 'active', active: true, closed: false }),
      makeMarket({ slug: 'inactive', active: false, closed: false }),
      makeMarket({ slug: 'closed', active: true, closed: true }),
    ]
    const result = filterAndCapMarkets(markets)
    expect(result.map(m => m.slug)).toEqual(['active'])
  })

  it('caps at top N per category by volume24h', () => {
    const markets = Array.from({ length: 25 }, (_, i) =>
      makeMarket({ slug: `market-${i}`, volume24hr: String(10000 + i * 100) })
    )
    const result = filterAndCapMarkets(markets, 5000, 20)
    expect(result.length).toBe(20)
  })

  it('keeps top-N across multiple categories', () => {
    const politics = Array.from({ length: 25 }, (_, i) =>
      makeMarket({ slug: `pol-${i}`, tags: [{ id: '1', label: 'Politics' }], volume24hr: '10000' })
    )
    const crypto = Array.from({ length: 25 }, (_, i) =>
      makeMarket({ slug: `cryp-${i}`, tags: [{ id: '2', label: 'Crypto' }], volume24hr: '10000' })
    )
    const result = filterAndCapMarkets([...politics, ...crypto], 5000, 20)
    const polCount = result.filter(m => m.slug.startsWith('pol-')).length
    const crypCount = result.filter(m => m.slug.startsWith('cryp-')).length
    expect(polCount).toBe(20)
    expect(crypCount).toBe(20)
  })

  it('uses "Other" category for markets with no tags', () => {
    const market = makeMarket({ slug: 'no-tag', tags: [] })
    const result = filterAndCapMarkets([market])
    expect(result).toHaveLength(1)
  })
})
