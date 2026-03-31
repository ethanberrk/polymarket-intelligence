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

function makeToolUseResponse(sections: Omit<CuratedSection, 'markets'>[]) {
  return {
    content: [{ type: 'tool_use', id: 'tu_1', name: 'output_sections', input: { sections } }],
  }
}

describe('clusterMarkets', () => {
  it('returns sections from tool use response', async () => {
    mockCreate.mockResolvedValue(makeToolUseResponse(VALID_SECTIONS))
    const result = await clusterMarkets(
      [makeMarket('market-a'), makeMarket('market-b'), makeMarket('market-c')],
      [makeHeadline('Big story')]
    )
    expect(result).toEqual(VALID_SECTIONS)
  })

  it('throws when tool use block is missing', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'oops' }] })
    await expect(clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])).rejects.toThrow(
      'tool use block'
    )
  })

  it('throws when sections array is empty', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu_1', name: 'output_sections', input: { sections: [] } }],
    })
    await expect(clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])).rejects.toThrow(
      'empty'
    )
  })

  it('calls Claude with haiku model and tool_choice forced', async () => {
    mockCreate.mockResolvedValue(makeToolUseResponse(VALID_SECTIONS))
    await clusterMarkets([makeMarket('m1'), makeMarket('m2'), makeMarket('m3')], [])
    const call = mockCreate.mock.calls[0][0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'output_sections' })
  })

  it('passes markets and headlines to Claude', async () => {
    mockCreate.mockResolvedValue(makeToolUseResponse(VALID_SECTIONS))
    const markets = [makeMarket('m1'), makeMarket('m2'), makeMarket('m3')]
    const headlines = [makeHeadline('Story')]
    await clusterMarkets(markets, headlines)
    const call = mockCreate.mock.calls[0][0]
    expect(call.messages[0].content).toContain('m1')
    expect(call.messages[0].content).toContain('Story')
  })
})
