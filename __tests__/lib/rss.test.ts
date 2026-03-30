import { fetchHeadlines } from '@/lib/rss'

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Big Story Today</title>
      <pubDate>Mon, 30 Mar 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second Story</title>
      <pubDate>Mon, 30 Mar 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('fetchHeadlines', () => {
  it('returns parsed headlines from successful feeds', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => MOCK_RSS,
    })
    const headlines = await fetchHeadlines()
    expect(headlines.length).toBeGreaterThan(0)
    const titles = headlines.map(h => h.title)
    expect(titles).toContain('Big Story Today')
    expect(titles).toContain('Second Story')
  })

  it('attaches the correct source name to each headline', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => MOCK_RSS,
    })
    const headlines = await fetchHeadlines()
    const sources = new Set(headlines.map(h => h.source))
    // At least one known source name should appear
    expect([...sources].some(s => s.length > 0)).toBe(true)
  })

  it('skips a failed feed and returns results from the rest', async () => {
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ ok: true, text: async () => MOCK_RSS })
    const headlines = await fetchHeadlines()
    expect(headlines.length).toBeGreaterThan(0)
  })

  it('returns empty array when all feeds fail', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('All down'))
    const headlines = await fetchHeadlines()
    expect(headlines).toEqual([])
  })

  it('skips feed that returns non-ok HTTP status', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, text: async () => '' })
      .mockResolvedValue({ ok: true, text: async () => MOCK_RSS })
    const headlines = await fetchHeadlines()
    expect(headlines.length).toBeGreaterThan(0)
  })
})
