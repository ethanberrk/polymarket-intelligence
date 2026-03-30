/**
 * @jest-environment node
 */
jest.mock('@/lib/polymarket', () => ({
  fetchAllMarkets: jest.fn(),
  filterAndCapMarkets: jest.fn(),
}))
jest.mock('@/lib/rss', () => ({
  fetchHeadlines: jest.fn(),
}))
jest.mock('@/lib/cluster', () => ({
  clusterMarkets: jest.fn(),
}))
jest.mock('@/lib/kv', () => ({
  setSections: jest.fn(),
}))

import { GET } from '@/app/api/refresh-sections/route'
import { fetchAllMarkets, filterAndCapMarkets } from '@/lib/polymarket'
import { fetchHeadlines } from '@/lib/rss'
import { clusterMarkets } from '@/lib/cluster'
import { setSections } from '@/lib/kv'
import type { CuratedSection } from '@/lib/types'

const MOCK_SECTIONS: Omit<CuratedSection, 'markets'>[] = [
  {
    id: 'politics',
    label: 'Politics',
    intro: 'Test.',
    narrative: 'Markets say 60%.',
    slugs: ['s1', 's2', 's3'],
  },
]

function makeRequest(secret?: string): Request {
  return new Request('http://localhost/api/refresh-sections', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  ;(fetchAllMarkets as jest.Mock).mockResolvedValue([])
  ;(filterAndCapMarkets as jest.Mock).mockReturnValue([])
  ;(fetchHeadlines as jest.Mock).mockResolvedValue([])
  ;(clusterMarkets as jest.Mock).mockResolvedValue(MOCK_SECTIONS)
  ;(setSections as jest.Mock).mockResolvedValue(undefined)
})

describe('GET /api/refresh-sections', () => {
  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(setSections).not.toHaveBeenCalled()
  })

  it('returns 401 with wrong secret', async () => {
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
    expect(setSections).not.toHaveBeenCalled()
  })

  it('returns 200 and calls setSections on success', async () => {
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sections).toBe(1)
    expect(setSections).toHaveBeenCalledWith(MOCK_SECTIONS)
  })

  it('passes filtered markets and headlines to clusterMarkets', async () => {
    const fakeMarkets = [{ slug: 'test' }]
    const fakeHeadlines = [{ title: 'Story', source: 'Reuters', publishedAt: '' }]
    ;(filterAndCapMarkets as jest.Mock).mockReturnValue(fakeMarkets)
    ;(fetchHeadlines as jest.Mock).mockResolvedValue(fakeHeadlines)
    await GET(makeRequest('test-secret'))
    expect(clusterMarkets).toHaveBeenCalledWith(fakeMarkets, fakeHeadlines)
  })

  it('returns 500 and does not call setSections when clusterMarkets throws', async () => {
    ;(clusterMarkets as jest.Mock).mockRejectedValue(new Error('Claude down'))
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(500)
    expect(setSections).not.toHaveBeenCalled()
  })

  it('returns 500 when fetchAllMarkets throws', async () => {
    ;(fetchAllMarkets as jest.Mock).mockRejectedValue(new Error('Polymarket down'))
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(500)
    expect(setSections).not.toHaveBeenCalled()
  })
})
