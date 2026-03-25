import { fetchMarketsBySlug, fetchTrendingMarkets, polymarketUrl } from '@/lib/polymarket'

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
