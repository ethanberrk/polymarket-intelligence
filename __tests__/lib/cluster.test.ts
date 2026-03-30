import type { RawMarket, Headline, CuratedSection } from '@/lib/types'

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn()
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
  ;(MockAnthropic as any).__mockCreate = mockCreate
  return { default: MockAnthropic, __esModule: true }
})

import { clusterMarkets } from '@/lib/cluster'
import Anthropic from '@anthropic-ai/sdk'

let mockCreate: jest.Mock
beforeEach(() => {
  mockCreate = jest.fn()
  ;(Anthropic as any).mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})

const makeMarket = (slug: string): RawMarket => ({
  id: slug,
  slug,
  question: `Will ${slug} happen?`,
  outcomes: '["Yes","No"]',
  outcomePrices: '["0.6","0.4"]',
  volume: '100000',
  volume24hr: '10000',
  endDate: '2026-12-31',
  active: true,
  closed: false,
  tags: [{ id: '1', label: 'Politics' }],
})

const makeHeadline = (title: string): Headline => ({
  title,
  source: 'Reuters',
  publishedAt: new Date().toISOString(),
})

const VALID_SECTIONS: Omit<CuratedSection, 'markets'>[] = [
  {
    id: 'us-politics',
    label: 'US Politics',
    intro: 'Key political markets.',
    narrative: 'Markets price a 60% chance of event.',
    slugs: ['market-a', 'market-b', 'market-c'],
    spotlightSlug: 'market-a',
    spotlightDescription: 'The headline market.',
  },
]

describe('clusterMarkets', () => {
  it('returns parsed sections from valid Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(VALID_SECTIONS) }],
    })
    const markets = [makeMarket('market-a'), makeMarket('market-b'), makeMarket('market-c')]
    const headlines = [makeHeadline('Big story')]
    const result = await clusterMarkets(markets, headlines)
    expect(result).toEqual(VALID_SECTIONS)
  })

  it('strips markdown code fences from Claude response', async () => {
    const wrapped = '```json\n' + JSON.stringify(VALID_SECTIONS) + '\n```'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: wrapped }],
    })
    const result = await clusterMarkets([makeMarket('market-a'), makeMarket('market-b'), makeMarket('market-c')], [])
    expect(result).toEqual(VALID_SECTIONS)
  })

  it('throws when Claude returns empty array', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    })
    await expect(clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])).rejects.toThrow(
      'empty'
    )
  })

  it('throws when Claude returns invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json at all' }],
    })
    await expect(clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])).rejects.toThrow()
  })

  it('calls Claude with haiku model', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(VALID_SECTIONS) }],
    })
    await clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])
    const call = mockCreate.mock.calls[0][0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
  })
})
