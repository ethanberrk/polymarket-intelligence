import { normalizeOutcomes, buildPageData } from '@/lib/transform'
import type { RawMarket, CuratedSection } from '@/lib/types'

const makeBinaryMarket = (overrides: Partial<RawMarket> = {}): RawMarket => ({
  id: '1',
  slug: 'test-market',
  question: 'Will X happen?',
  outcomes: '["Yes","No"]',
  outcomePrices: '["0.65","0.35"]',
  volume: '10000.00',
  volume24hr: '500.00',
  endDate: '2026-12-31',
  active: true,
  closed: false,
  tags: [],
  ...overrides,
})

describe('normalizeOutcomes', () => {
  it('parses binary market outcomes correctly', () => {
    const result = normalizeOutcomes(makeBinaryMarket())
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ label: 'Yes', probability: 0.65 })
    expect(result[1]).toEqual({ label: 'No', probability: 0.35 })
  })

  it('normalizes multi-outcome markets so probabilities sum to 1', () => {
    const market = makeBinaryMarket({
      outcomes: '["A","B","C"]',
      outcomePrices: '["0.4","0.4","0.4"]',
    })
    const result = normalizeOutcomes(market)
    const total = result.reduce((s, o) => s + o.probability, 0)
    expect(total).toBeCloseTo(1.0)
    expect(result[0].probability).toBeCloseTo(1/3)
  })

  it('returns empty array on malformed JSON', () => {
    const market = makeBinaryMarket({ outcomes: 'not-json' })
    expect(normalizeOutcomes(market)).toEqual([])
  })

  it('returns empty array when total price is 0', () => {
    const market = makeBinaryMarket({ outcomePrices: '["0","0"]' })
    expect(normalizeOutcomes(market)).toEqual([])
  })

  it('treats NaN prices as 0', () => {
    const market = makeBinaryMarket({
      outcomes: '["Yes","No"]',
      outcomePrices: '["bad","0.5"]',
    })
    const result = normalizeOutcomes(market)
    expect(result[0].probability).toBeCloseTo(0)
    expect(result[1].probability).toBeCloseTo(1)
  })
})

describe('buildPageData', () => {
  const mockFetch = jest.fn()
  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
  })

  const sectionConfig: Omit<CuratedSection, 'markets'>[] = [{
    id: 'test',
    label: 'Test Section',
    intro: 'An intro.',
    narrative: 'A narrative.',
    slugs: ['test-market'],
  }]

  it('returns PageData with populated section markets on success', async () => {
    const rawMarket = makeBinaryMarket()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [rawMarket],
    })
    const result = await buildPageData(sectionConfig)
    expect(result).not.toBeNull()
    expect(result!.sections[0].markets).toHaveLength(1)
    expect(result!.sections[0].markets[0].slug).toBe('test-market')
  })

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const result = await buildPageData(sectionConfig)
    expect(result).toBeNull()
  })

  it('sets fetchedAt as an ISO timestamp', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [makeBinaryMarket()] })
    const before = new Date().toISOString()
    const result = await buildPageData(sectionConfig)
    const after = new Date().toISOString()
    expect(result!.fetchedAt >= before).toBe(true)
    expect(result!.fetchedAt <= after).toBe(true)
  })

  it('silently omits slugs not found in API response', async () => {
    const configs: Omit<CuratedSection, 'markets'>[] = [{
      id: 'test', label: 'T', intro: '', narrative: '',
      slugs: ['found-market', 'missing-market'],
    }]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeBinaryMarket({ slug: 'found-market' })],
    })
    const result = await buildPageData(configs)
    expect(result!.sections[0].markets).toHaveLength(1)
    expect(result!.sections[0].markets[0].slug).toBe('found-market')
  })

  it('computes totalVolume as sum of all section market volumes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeBinaryMarket({ volume: '1000.00' })],
    })
    const result = await buildPageData(sectionConfig)
    expect(result!.totalVolume).toBe(1000)
  })
})
